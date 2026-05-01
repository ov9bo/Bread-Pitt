import { eq } from "drizzle-orm";
import { db } from "../lib/db/client";
import { googleAccounts } from "../lib/db/schema";
import { encryptToken, isEncrypted } from "../lib/crypto/tokens";

// One-shot backfill: re-encrypt any plaintext Google OAuth tokens in the DB.
// Idempotent — already-encrypted rows are skipped.

const rows = db.select().from(googleAccounts).all();
let updated = 0;

for (const row of rows) {
  const accessIsCipher = isEncrypted(row.accessToken);
  const refreshIsCipher = isEncrypted(row.refreshToken);
  if (accessIsCipher && refreshIsCipher) continue;

  db.update(googleAccounts)
    .set({
      accessToken: accessIsCipher ? row.accessToken : encryptToken(row.accessToken),
      refreshToken: refreshIsCipher ? row.refreshToken : encryptToken(row.refreshToken),
    })
    .where(eq(googleAccounts.id, row.id))
    .run();
  updated += 1;
}

console.log(`✓ encrypted ${updated} of ${rows.length} google_accounts row(s)`);
