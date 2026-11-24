# Leak matrix (baseline)

| channel | blob report | error-context.md | html report | html report (embedded trace/data) | json reporter | junit reporter | runner stdout | storageState file | trace: actions/events | trace: network log | trace: other | trace: resources (bodies/snapshots) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fillPassword | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK | LEAK |  | LEAK |
| fillText | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK | LEAK |  | LEAK |
| typeText | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK | LEAK |  | LEAK |
| evaluateArg | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |  |  |
| browserConsole | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |  |  |
| localStorage | LEAK |  |  | LEAK |  |  |  | LEAK | LEAK |  |  |  |
| selector | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK |  |  |  |
| urlQuery | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK | LEAK |  |  |
| extraHeader | LEAK |  |  | LEAK |  |  |  |  | LEAK | LEAK |  |  |
| apiBearer | LEAK |  |  | LEAK |  |  |  |  | LEAK | LEAK |  |  |
| apiBody | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |  | LEAK |
| basicAuthPass |  |  |  |  |  |  |  |  |  |  |  |  |
| addCookie | LEAK |  |  | LEAK |  |  |  |  | LEAK | LEAK |  |  |
| serverCookie | LEAK |  |  | LEAK |  |  |  | LEAK | LEAK | LEAK |  |  |
| serverRendered | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |  | LEAK |
| responseBody | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |  | LEAK |
| stepTitle | LEAK |  | LEAK | LEAK | LEAK |  |  |  | LEAK |  |  |  |
| stepParam | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |  |  |
| expectMessage | LEAK |  | LEAK | LEAK |  |  |  |  | LEAK |  |  |  |
| expectExpected | LEAK |  |  | LEAK |  |  |  |  | LEAK |  |  |  |
| testStdout | LEAK |  | LEAK | LEAK | LEAK | LEAK | LEAK |  | LEAK |  |  |  |
| attachBody | LEAK |  | LEAK | LEAK | LEAK |  |  |  |  |  | LEAK |  |
| annotation | LEAK |  | LEAK | LEAK | LEAK | LEAK |  |  | LEAK |  |  |  |
| envOnly |  |  |  |  |  |  |  |  |  |  |  |  |
| failTextValue | LEAK | LEAK | LEAK | LEAK | LEAK |  |  |  | LEAK |  | LEAK |  |
| failPasswordValue | LEAK | LEAK | LEAK | LEAK | LEAK |  |  |  | LEAK |  | LEAK |  |
| failCompare | LEAK | LEAK | LEAK | LEAK | LEAK |  |  |  | LEAK |  | LEAK |  |

Not found anywhere: basicAuthPass, envOnly

## Details

- **fillPassword**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!test.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.network; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!resources/ba263970d2c1ca04e30947d4ae15ae0c4039b23c.dat (+1 more)
  - html report (embedded trace/data): plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!test.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.network; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!resources/ba263970d2c1ca04e30947d4ae15ae0c4039b23c.dat
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!test.trace; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
  - trace: network log: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.network
  - trace: resources (bodies/snapshots): plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!resources/ba263970d2c1ca04e30947d4ae15ae0c4039b23c.dat
- **fillText**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!test.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.network; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!resources/ba263970d2c1ca04e30947d4ae15ae0c4039b23c.dat (+1 more)
  - html report (embedded trace/data): plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!test.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.network; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!resources/ba263970d2c1ca04e30947d4ae15ae0c4039b23c.dat
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!test.trace; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
  - trace: network log: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.network
  - trace: resources (bodies/snapshots): plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!resources/ba263970d2c1ca04e30947d4ae15ae0c4039b23c.dat
- **typeText**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!test.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.network; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!resources/ba263970d2c1ca04e30947d4ae15ae0c4039b23c.dat (+1 more)
  - html report (embedded trace/data): plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!test.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.network; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!resources/ba263970d2c1ca04e30947d4ae15ae0c4039b23c.dat
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!test.trace; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
  - trace: network log: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.network
  - trace: resources (bodies/snapshots): plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!resources/ba263970d2c1ca04e30947d4ae15ae0c4039b23c.dat
- **selector**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!test.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!test.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!test.trace; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **urlQuery**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!test.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.network; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!test.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.network
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!test.trace; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
  - trace: network log: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.network
- **evaluateArg**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **browserConsole**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **localStorage**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace
  - html report (embedded trace/data): plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace
  - storageState file: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\state.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **serverCookie**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.network
  - html report (embedded trace/data): plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.network
  - storageState file: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\state.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
  - trace: network log: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.network
- **serverRendered**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!resources/033332c3f10dccef7bcb61e140d4c1ada6b77907.html
  - html report (embedded trace/data): plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!resources/033332c3f10dccef7bcb61e140d4c1ada6b77907.html
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
  - trace: resources (bodies/snapshots): plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!resources/033332c3f10dccef7bcb61e140d4c1ada6b77907.html
- **responseBody**
  - blob report: plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!1-trace.trace; plain @ blob-report\report.zip!resources/91ebd107954c0e21516235985cbba2c1e7c16891.zip!resources/79e1b1073214f2e33100d494e692eb2ccd1d10d6.json; plain @ blob-report\report.zip!resources/20f321a934bd4e8104ddd5c4a85f974e72e7fc96.zip!resources/79e1b1073214f2e33100d494e692eb2ccd1d10d6.json
  - html report (embedded trace/data): plain @ html-report\data\53bfafe4a6edeafbe815f4df95c1fc3e0c047ac7.zip!resources/79e1b1073214f2e33100d494e692eb2ccd1d10d6.json; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!1-trace.trace; plain @ html-report\data\da99f8a2b5a9e7608baab53dbd19313d6a02fd39.zip!resources/79e1b1073214f2e33100d494e692eb2ccd1d10d6.json
  - trace: resources (bodies/snapshots): plain @ test-results\secrets-API-request-contex-f5826-JSON-body-token-in-response\trace.zip!resources/79e1b1073214f2e33100d494e692eb2ccd1d10d6.json; plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!resources/79e1b1073214f2e33100d494e692eb2ccd1d10d6.json
  - trace: actions/events: plain @ test-results\secrets-browser-input-fill-de3d0-ector-form-post-server-data\trace.zip!1-trace.trace
- **extraHeader**
  - blob report: plain @ blob-report\report.zip!resources/38b2b66f661f4109a3ef65b2d9b4fc48c85e8b1a.zip!2-trace.network; plain @ blob-report\report.zip!resources/38b2b66f661f4109a3ef65b2d9b4fc48c85e8b1a.zip!0-trace.trace; plain @ blob-report\report.zip!resources/38b2b66f661f4109a3ef65b2d9b4fc48c85e8b1a.zip!0-trace.network
  - html report (embedded trace/data): plain @ html-report\data\bae4ece2d47bd0b7db7e37eda59ec6b8748cf5a9.zip!2-trace.network; plain @ html-report\data\bae4ece2d47bd0b7db7e37eda59ec6b8748cf5a9.zip!0-trace.trace; plain @ html-report\data\bae4ece2d47bd0b7db7e37eda59ec6b8748cf5a9.zip!0-trace.network
  - trace: network log: plain @ test-results\secrets-extra-headers-sent-by-page-and-request-fixture\trace.zip!2-trace.network; plain @ test-results\secrets-extra-headers-sent-by-page-and-request-fixture\trace.zip!0-trace.network
  - trace: actions/events: plain @ test-results\secrets-extra-headers-sent-by-page-and-request-fixture\trace.zip!0-trace.trace
- **apiBearer**
  - blob report: plain @ blob-report\report.zip!resources/20f321a934bd4e8104ddd5c4a85f974e72e7fc96.zip!0-trace.trace; plain @ blob-report\report.zip!resources/20f321a934bd4e8104ddd5c4a85f974e72e7fc96.zip!0-trace.network
  - html report (embedded trace/data): plain @ html-report\data\53bfafe4a6edeafbe815f4df95c1fc3e0c047ac7.zip!0-trace.trace; plain @ html-report\data\53bfafe4a6edeafbe815f4df95c1fc3e0c047ac7.zip!0-trace.network
  - trace: actions/events: plain @ test-results\secrets-API-request-contex-f5826-JSON-body-token-in-response\trace.zip!0-trace.trace
  - trace: network log: plain @ test-results\secrets-API-request-contex-f5826-JSON-body-token-in-response\trace.zip!0-trace.network
- **apiBody**
  - blob report: plain @ blob-report\report.zip!resources/20f321a934bd4e8104ddd5c4a85f974e72e7fc96.zip!0-trace.trace; plain @ blob-report\report.zip!resources/20f321a934bd4e8104ddd5c4a85f974e72e7fc96.zip!resources/c5381372b7d3d79df7158482a679e1ac4e7c5de9.json
  - html report (embedded trace/data): plain @ html-report\data\53bfafe4a6edeafbe815f4df95c1fc3e0c047ac7.zip!0-trace.trace; plain @ html-report\data\53bfafe4a6edeafbe815f4df95c1fc3e0c047ac7.zip!resources/c5381372b7d3d79df7158482a679e1ac4e7c5de9.json
  - trace: actions/events: plain @ test-results\secrets-API-request-contex-f5826-JSON-body-token-in-response\trace.zip!0-trace.trace
  - trace: resources (bodies/snapshots): plain @ test-results\secrets-API-request-contex-f5826-JSON-body-token-in-response\trace.zip!resources/c5381372b7d3d79df7158482a679e1ac4e7c5de9.json
- **addCookie**
  - blob report: plain @ blob-report\report.zip!resources/2580a144979167d096e08b22c9ac49195b2c9cb2.zip!1-trace.trace; plain @ blob-report\report.zip!resources/2580a144979167d096e08b22c9ac49195b2c9cb2.zip!1-trace.network
  - html report (embedded trace/data): plain @ html-report\data\d8a27d44f2056fa7193d5791367f9d9fdc30b4ea.zip!1-trace.trace; plain @ html-report\data\d8a27d44f2056fa7193d5791367f9d9fdc30b4ea.zip!1-trace.network
  - trace: actions/events: plain @ test-results\secrets-cookies-added-by-the-test\trace.zip!1-trace.trace
  - trace: network log: plain @ test-results\secrets-cookies-added-by-the-test\trace.zip!1-trace.network
- **attachBody**
  - blob report: plain @ blob-report\report.zip!resources/bd3cf3e491406487137759ec0215010928809385.zip!attachments/6d6328a6038bc60d168e2c431ebc15eb3ae793b4; base64 @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\846c4497843d6851d4f75e9357c86f592612cc5f.zip!attachments/6d6328a6038bc60d168e2c431ebc15eb3ae793b4
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - json reporter: base64 @ results.json
  - trace: other: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!attachments/6d6328a6038bc60d168e2c431ebc15eb3ae793b4
- **stepTitle**
  - blob report: plain @ blob-report\report.zip!resources/bd3cf3e491406487137759ec0215010928809385.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\846c4497843d6851d4f75e9357c86f592612cc5f.zip!test.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - json reporter: plain @ results.json
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **stepParam**
  - blob report: plain @ blob-report\report.zip!resources/bd3cf3e491406487137759ec0215010928809385.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\846c4497843d6851d4f75e9357c86f592612cc5f.zip!test.trace
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **expectMessage**
  - blob report: plain @ blob-report\report.zip!resources/bd3cf3e491406487137759ec0215010928809385.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\846c4497843d6851d4f75e9357c86f592612cc5f.zip!test.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **expectExpected**
  - blob report: plain @ blob-report\report.zip!resources/bd3cf3e491406487137759ec0215010928809385.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\846c4497843d6851d4f75e9357c86f592612cc5f.zip!test.trace
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **testStdout**
  - blob report: plain @ blob-report\report.zip!resources/bd3cf3e491406487137759ec0215010928809385.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\846c4497843d6851d4f75e9357c86f592612cc5f.zip!test.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - junit reporter: plain @ junit.xml
  - json reporter: plain @ results.json
  - runner stdout: plain @ stdout.log
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **annotation**
  - blob report: plain @ blob-report\report.zip!resources/bd3cf3e491406487137759ec0215010928809385.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\846c4497843d6851d4f75e9357c86f592612cc5f.zip!test.trace
  - html report: plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json; plain @ html-report\index.html!embedded.zip!report.json
  - junit reporter: plain @ junit.xml
  - json reporter: plain @ results.json
  - trace: actions/events: plain @ test-results\secrets-test-runner-surfac-64b58-attachments-annotations-env\trace.zip!test.trace
- **failTextValue**
  - blob report: plain @ blob-report\report.zip!resources/8f4236391d0501aa13a0d64d26360ecb14d53bf3.md; plain @ blob-report\report.zip!resources/8de997a3b5eb739ce2a285cb7308064c5be5898f.zip!attachments/7256f79cb87d88eeb030f51ad04da1996da5a663; plain @ blob-report\report.zip!resources/8de997a3b5eb739ce2a285cb7308064c5be5898f.zip!test.trace; plain @ blob-report\report.zip!resources/8de997a3b5eb739ce2a285cb7308064c5be5898f.zip!1-trace.trace (+1 more)
  - html report: plain @ html-report\data\7256f79cb87d88eeb030f51ad04da1996da5a663.md; plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - html report (embedded trace/data): plain @ html-report\data\9f09fe7a83ab6aff92357b715f3678f76bcbe0c0.zip!attachments/7256f79cb87d88eeb030f51ad04da1996da5a663; plain @ html-report\data\9f09fe7a83ab6aff92357b715f3678f76bcbe0c0.zip!test.trace; plain @ html-report\data\9f09fe7a83ab6aff92357b715f3678f76bcbe0c0.zip!1-trace.trace
  - json reporter: plain @ results.json
  - error-context.md: plain @ test-results\secrets-failures-failing-assertion-on-a-text-input\error-context.md
  - trace: other: plain @ test-results\secrets-failures-failing-assertion-on-a-text-input\trace.zip!attachments/7256f79cb87d88eeb030f51ad04da1996da5a663
  - trace: actions/events: plain @ test-results\secrets-failures-failing-assertion-on-a-text-input\trace.zip!test.trace; plain @ test-results\secrets-failures-failing-assertion-on-a-text-input\trace.zip!1-trace.trace
- **failPasswordValue**
  - blob report: plain @ blob-report\report.zip!resources/7645235228330e12891b379e9a9a2f812c96d504.md; plain @ blob-report\report.zip!resources/28a7d4d6a069599f0480cf4cc321c05abb65fbe0.zip!attachments/30a6c89c8cafd641b8551b152ba149059c3ae665; plain @ blob-report\report.zip!resources/28a7d4d6a069599f0480cf4cc321c05abb65fbe0.zip!test.trace; plain @ blob-report\report.zip!resources/28a7d4d6a069599f0480cf4cc321c05abb65fbe0.zip!1-trace.trace (+1 more)
  - html report: plain @ html-report\data\30a6c89c8cafd641b8551b152ba149059c3ae665.md; plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - html report (embedded trace/data): plain @ html-report\data\fa15ae3924e2b358ddc05759035dfc5439eb7d01.zip!attachments/30a6c89c8cafd641b8551b152ba149059c3ae665; plain @ html-report\data\fa15ae3924e2b358ddc05759035dfc5439eb7d01.zip!test.trace; plain @ html-report\data\fa15ae3924e2b358ddc05759035dfc5439eb7d01.zip!1-trace.trace
  - json reporter: plain @ results.json
  - error-context.md: plain @ test-results\secrets-failures-failing-assertion-on-a-password-input\error-context.md
  - trace: other: plain @ test-results\secrets-failures-failing-assertion-on-a-password-input\trace.zip!attachments/30a6c89c8cafd641b8551b152ba149059c3ae665
  - trace: actions/events: plain @ test-results\secrets-failures-failing-assertion-on-a-password-input\trace.zip!test.trace; plain @ test-results\secrets-failures-failing-assertion-on-a-password-input\trace.zip!1-trace.trace
- **failCompare**
  - blob report: plain @ blob-report\report.zip!resources/6c6f12aa6592c5e38c854d01823e15bfae8fcee9.md; plain @ blob-report\report.zip!resources/7744f57a77c0f475667d6b1cd6cc7d7c07980d6e.zip!attachments/36eaf59d86aa6218322845b3e58ea4a4683b1ffb; plain @ blob-report\report.zip!resources/7744f57a77c0f475667d6b1cd6cc7d7c07980d6e.zip!test.trace; plain @ blob-report\report.zip!report.jsonl
  - html report (embedded trace/data): plain @ html-report\data\1f2c59986bed947178b8a4fd40a97a1a7e9ddd2f.zip!attachments/36eaf59d86aa6218322845b3e58ea4a4683b1ffb; plain @ html-report\data\1f2c59986bed947178b8a4fd40a97a1a7e9ddd2f.zip!test.trace
  - html report: plain @ html-report\data\36eaf59d86aa6218322845b3e58ea4a4683b1ffb.md; plain @ html-report\index.html!embedded.zip!9cf1a5537777654058aa.json
  - json reporter: plain @ results.json
  - error-context.md: plain @ test-results\secrets-failures-failing-plain-value-comparison\error-context.md
  - trace: other: plain @ test-results\secrets-failures-failing-plain-value-comparison\trace.zip!attachments/36eaf59d86aa6218322845b3e58ea4a4683b1ffb
  - trace: actions/events: plain @ test-results\secrets-failures-failing-plain-value-comparison\trace.zip!test.trace
