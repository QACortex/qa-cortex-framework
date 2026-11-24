# Leak matrix (lean)

| channel | blob report | error-context.md | html report | html report (embedded trace/data) | json reporter | junit reporter | runner stdout | storageState file | trace: actions/events | trace: other |
|---|---|---|---|---|---|---|---|---|---|---|
| fillPassword | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK |  |
| fillText | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK |  |
| typeText | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK |  |
| evaluateArg | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |
| browserConsole | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |
| localStorage | LEAK |  |  | LEAK |  |  |  | LEAK | LEAK |  |
| selector | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK |  |
| urlQuery | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK |  |
| extraHeader | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |
| apiBearer | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |
| apiBody | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |
| basicAuthPass |  |  |  |  |  |  |  |  |  |  |
| addCookie | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |
| serverCookie | LEAK |  |  | LEAK |  |  |  | LEAK | LEAK |  |
| serverRendered |  |  |  |  |  |  |  |  |  |  |
| responseBody | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |
| stepTitle | LEAK |  | LEAK | LEAK | LEAK |  |  |  | LEAK |  |
| stepParam | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |
| expectMessage | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK |  |
| expectExpected | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |
| testStdout | LEAK |  | LEAK | LEAK | LEAK | LEAK | LEAK |  | LEAK |  |
| attachBody | LEAK |  | LEAK | LEAK | LEAK |  |  |  |  | LEAK |
| annotation | LEAK |  | LEAK | LEAK | LEAK | LEAK |  |  | LEAK |  |
| envOnly |  |  |  |  |  |  |  |  |  |  |
| failTextValue | LEAK | LEAK | LEAK | LEAK | LEAK |  |  |  | LEAK | LEAK |
| failPasswordValue | LEAK | LEAK | LEAK | LEAK | LEAK |  |  |  | LEAK | LEAK |
| failCompare | LEAK | LEAK | LEAK | LEAK | LEAK |  |  |  | LEAK | LEAK |

Not found anywhere: basicAuthPass, serverRendered, envOnly

## Details

- **fillPassword**
  - blob report: plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!test.trace; plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!1-trace.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!test.trace; plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!1-trace.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!test.trace; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **fillText**
  - blob report: plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!test.trace; plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!1-trace.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!test.trace; plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!1-trace.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!test.trace; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **typeText**
  - blob report: plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!test.trace; plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!1-trace.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!test.trace; plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!1-trace.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!test.trace; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **selector**
  - blob report: plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!test.trace; plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!1-trace.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!test.trace; plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!1-trace.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!test.trace; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **urlQuery**
  - blob report: plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!test.trace; plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!1-trace.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!test.trace; plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!1-trace.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!test.trace; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **evaluateArg**
  - blob report: plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!1-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!1-trace.trace
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **browserConsole**
  - blob report: plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!1-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!1-trace.trace
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **localStorage**
  - blob report: plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!1-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!1-trace.trace
  - storageState file: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\state.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **serverCookie**
  - blob report: plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!1-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!1-trace.trace
  - storageState file: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\state.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **responseBody**
  - blob report: plain @ blob-report\report.zip!resources/5c275bd2f12a0c3fafcd0aa6dc5dfbf12cdb646a.zip!1-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\9cc51c7f03c04a10510d485abbe33c96ad73633e.zip!1-trace.trace
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **extraHeader**
  - blob report: plain @ blob-report\report.zip!resources/89157deb5d41c203c8783b5ac80fc32f159e5e03.zip!0-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\58b27597163135bf72a80123202f6f747034c51f.zip!0-trace.trace
  - trace: actions/events: plain @ test-results\secrets-extra-headers-sent-by-page-and-request-fixture\trace.zip!0-trace.trace
- **apiBearer**
  - blob report: plain @ blob-report\report.zip!resources/f9aa92b7c2353c73529551f55546c6aacc784f93.zip!0-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\14080e60389847ffc643ae1b3c7cf9e368c7e41e.zip!0-trace.trace
  - trace: actions/events: plain @ test-results\secrets-API-request-contex-f5826-JSON-body-token-in-response\trace.zip!0-trace.trace
- **apiBody**
  - blob report: plain @ blob-report\report.zip!resources/f9aa92b7c2353c73529551f55546c6aacc784f93.zip!0-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\14080e60389847ffc643ae1b3c7cf9e368c7e41e.zip!0-trace.trace
  - trace: actions/events: plain @ test-results\secrets-API-request-contex-f5826-JSON-body-token-in-response\trace.zip!0-trace.trace
- **addCookie**
  - blob report: plain @ blob-report\report.zip!resources/73b99c69d0200c4632d6197f02e7ce0ace053ce1.zip!1-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\fe4fa3c1a319d56973fc0400274c9ceac073ddc6.zip!1-trace.trace
  - trace: actions/events: plain @ test-results\secrets-cookies-added-by-the-test\trace.zip!1-trace.trace
- **attachBody**
  - blob report: plain @ blob-report\report.zip!resources/8083622dce359720a1e4212b7fced23798f98257.zip!attachments/6d6328a6038bc60d168e2c431ebc15eb3ae793b4; base64 @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\ba3ec7ea5dba861247102b8c2b73067418cb9e51.zip!attachments/6d6328a6038bc60d168e2c431ebc15eb3ae793b4
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - json reporter: base64 @ results.json
  - trace: other: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!attachments/6d6328a6038bc60d168e2c431ebc15eb3ae793b4
- **stepTitle**
  - blob report: plain @ blob-report\report.zip!resources/8083622dce359720a1e4212b7fced23798f98257.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\ba3ec7ea5dba861247102b8c2b73067418cb9e51.zip!test.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - json reporter: plain @ results.json
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **stepParam**
  - blob report: plain @ blob-report\report.zip!resources/8083622dce359720a1e4212b7fced23798f98257.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\ba3ec7ea5dba861247102b8c2b73067418cb9e51.zip!test.trace
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **expectMessage**
  - blob report: plain @ blob-report\report.zip!resources/8083622dce359720a1e4212b7fced23798f98257.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\ba3ec7ea5dba861247102b8c2b73067418cb9e51.zip!test.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **expectExpected**
  - blob report: plain @ blob-report\report.zip!resources/8083622dce359720a1e4212b7fced23798f98257.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\ba3ec7ea5dba861247102b8c2b73067418cb9e51.zip!test.trace
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **testStdout**
  - blob report: plain @ blob-report\report.zip!resources/8083622dce359720a1e4212b7fced23798f98257.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\ba3ec7ea5dba861247102b8c2b73067418cb9e51.zip!test.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - junit reporter: plain @ junit.xml
  - json reporter: plain @ results.json
  - runner stdout: plain @ stdout.log
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **annotation**
  - blob report: plain @ blob-report\report.zip!resources/8083622dce359720a1e4212b7fced23798f98257.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\ba3ec7ea5dba861247102b8c2b73067418cb9e51.zip!test.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json; plain @ html-report\index.html!embedded.zip!report.json
  - junit reporter: plain @ junit.xml
  - json reporter: plain @ results.json
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **failTextValue**
  - blob report: plain @ blob-report\report.zip!resources/f09636fbca5b3c325c5e98d29039239c96730950.md; plain @ blob-report\report.zip!resources/89fd0e6b919a920bb3d643005aac9566d0075055.zip!attachments/7256f79cb87d88eeb030f51ad04da1996da5a663; plain @ blob-report\report.zip!resources/89fd0e6b919a920bb3d643005aac9566d0075055.zip!test.trace; plain @ blob-report\report.zip!resources/89fd0e6b919a920bb3d643005aac9566d0075055.zip!1-trace.trace (+1 more)
  - html report: plain @ html-report\data\7256f79cb87d88eeb030f51ad04da1996da5a663.md; plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - html report (embedded trace/data): plain @ html-report\data\d146d125e4f5089c9d3e1f8a4e830998ab6a46bf.zip!attachments/7256f79cb87d88eeb030f51ad04da1996da5a663; plain @ html-report\data\d146d125e4f5089c9d3e1f8a4e830998ab6a46bf.zip!test.trace; plain @ html-report\data\d146d125e4f5089c9d3e1f8a4e830998ab6a46bf.zip!1-trace.trace
  - json reporter: plain @ results.json
  - error-context.md: plain @ test-results\secrets-failures-failing-assertion-on-a-text-input\error-context.md
  - trace: other: plain @ test-results\secrets-failures-failing-assertion-on-a-text-input\trace.zip!attachments/7256f79cb87d88eeb030f51ad04da1996da5a663
  - trace: actions/events: plain @ test-results\secrets-failures-failing-assertion-on-a-text-input\trace.zip!test.trace; plain @ test-results\secrets-failures-failing-assertion-on-a-text-input\trace.zip!1-trace.trace
- **failPasswordValue**
  - blob report: plain @ blob-report\report.zip!resources/af3ed381cea8ed456dab4c931987042143481f9e.md; plain @ blob-report\report.zip!resources/25d27ba14bf103e2eef9a2b03fd2fa4f78a07070.zip!attachments/30a6c89c8cafd641b8551b152ba149059c3ae665; plain @ blob-report\report.zip!resources/25d27ba14bf103e2eef9a2b03fd2fa4f78a07070.zip!test.trace; plain @ blob-report\report.zip!resources/25d27ba14bf103e2eef9a2b03fd2fa4f78a07070.zip!1-trace.trace (+1 more)
  - html report (embedded trace/data): plain @ html-report\data\21eb398072066d2aa2b223f5b14fed6b1c732ad5.zip!attachments/30a6c89c8cafd641b8551b152ba149059c3ae665; plain @ html-report\data\21eb398072066d2aa2b223f5b14fed6b1c732ad5.zip!test.trace; plain @ html-report\data\21eb398072066d2aa2b223f5b14fed6b1c732ad5.zip!1-trace.trace
  - html report: plain @ html-report\data\30a6c89c8cafd641b8551b152ba149059c3ae665.md; plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - json reporter: plain @ results.json
  - error-context.md: plain @ test-results\secrets-failures-failing-assertion-on-a-password-input\error-context.md
  - trace: other: plain @ test-results\secrets-failures-failing-assertion-on-a-password-input\trace.zip!attachments/30a6c89c8cafd641b8551b152ba149059c3ae665
  - trace: actions/events: plain @ test-results\secrets-failures-failing-assertion-on-a-password-input\trace.zip!test.trace; plain @ test-results\secrets-failures-failing-assertion-on-a-password-input\trace.zip!1-trace.trace
- **failCompare**
  - blob report: plain @ blob-report\report.zip!resources/5a43a8e77b68f5088526c0da068e9fc958646340.md; plain @ blob-report\report.zip!resources/91e7adf2eb91b3099bd488c68e9faf01565b7e9b.zip!attachments/36eaf59d86aa6218322845b3e58ea4a4683b1ffb; plain @ blob-report\report.zip!resources/91e7adf2eb91b3099bd488c68e9faf01565b7e9b.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report: plain @ html-report\data\36eaf59d86aa6218322845b3e58ea4a4683b1ffb.md; plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - html report (embedded trace/data): plain @ html-report\data\a7ebcdb16160d1193e232edd1f8457248bfe19b5.zip!attachments/36eaf59d86aa6218322845b3e58ea4a4683b1ffb; plain @ html-report\data\a7ebcdb16160d1193e232edd1f8457248bfe19b5.zip!test.trace
  - json reporter: plain @ results.json
  - error-context.md: plain @ test-results\secrets-failures-failing-plain-value-comparison\error-context.md
  - trace: other: plain @ test-results\secrets-failures-failing-plain-value-comparison\trace.zip!attachments/36eaf59d86aa6218322845b3e58ea4a4683b1ffb
  - trace: actions/events: plain @ test-results\secrets-failures-failing-plain-value-comparison\trace.zip!test.trace
