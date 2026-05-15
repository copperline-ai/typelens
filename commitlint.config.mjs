import { RuleConfigSeverity } from "@commitlint/types";

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [RuleConfigSeverity.Disabled],
    "body-max-line-length": [RuleConfigSeverity.Disabled],
    "footer-max-line-length": [RuleConfigSeverity.Disabled],
  },
};
