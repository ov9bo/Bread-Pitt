import { syncKnowledge } from "../lib/knowledge/parse";

syncKnowledge().then((r) => {
  console.log("✓ knowledge synced", r);
});
