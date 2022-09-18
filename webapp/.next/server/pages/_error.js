(() => {
var exports = {};
exports.id = 820;
exports.ids = [820];
exports.modules = {

/***/ 484:
/***/ (() => {

var _global = (typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {}); _global.SENTRY_RELEASE={id:"SKJ_I6npCnjx16Vr40v84"};

/***/ }),

/***/ 107:
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony import */ var _sentry_nextjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(97);
/* harmony import */ var _sentry_nextjs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_sentry_nextjs__WEBPACK_IMPORTED_MODULE_0__);
global.__rewriteFramesDistDir__ = ".next";
// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
_sentry_nextjs__WEBPACK_IMPORTED_MODULE_0__.init({
    dsn: SENTRY_DSN || "https://2becbe2880ce41ed8198fd63c2cd490f@o1381755.ingest.sentry.io/6695436",
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0
});


/***/ }),

/***/ 343:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ _error)
});

// EXTERNAL MODULE: external "@emotion/react/jsx-runtime"
var jsx_runtime_ = __webpack_require__(193);
// EXTERNAL MODULE: external "@sentry/nextjs"
var nextjs_ = __webpack_require__(97);
;// CONCATENATED MODULE: external "next/error"
const error_namespaceObject = require("next/error");
var error_default = /*#__PURE__*/__webpack_require__.n(error_namespaceObject);
// EXTERNAL MODULE: external "react"
var external_react_ = __webpack_require__(689);
;// CONCATENATED MODULE: external "prop-types"
const external_prop_types_namespaceObject = require("prop-types");
var external_prop_types_default = /*#__PURE__*/__webpack_require__.n(external_prop_types_namespaceObject);
;// CONCATENATED MODULE: ./pages/_error.jsx
/**
 * NOTE: This requires `@sentry/nextjs` version 7.3.0 or higher.
 *
 * NOTE: If using this with `next` version 12.2.0 or lower, uncomment the
 * penultimate line in `CustomErrorComponent`.
 *
 * This page is loaded by Nextjs:
 *  - on the server, when data-fetching methods throw or reject
 *  - on the client, when `getInitialProps` throws or rejects
 *  - on the client, when a React lifecycle method throws or rejects, and it's
 *    caught by the built-in Nextjs error boundary
 *
 * See:
 *  - https://nextjs.org/docs/basic-features/data-fetching/overview
 *  - https://nextjs.org/docs/api-reference/data-fetching/get-initial-props
 *  - https://reactjs.org/docs/error-boundaries.html
 */ 




function CustomErrorComponent({ statusCode  }) {
    return /*#__PURE__*/ jsx_runtime_.jsx((error_default()), {
        statusCode: statusCode
    });
}
CustomErrorComponent.propTypes = {
    statusCode: (external_prop_types_default()).number.isRequired
};
CustomErrorComponent.getInitialProps = async (contextData)=>{
    // In case this is running in a serverless function, await this in order to give Sentry
    // time to send the error before the lambda exits
    await nextjs_.captureUnderscoreErrorException(contextData);
    // This will contain the status code of the response
    return error_default().getInitialProps(contextData);
};
/* harmony default export */ const _error = (CustomErrorComponent);


/***/ }),

/***/ 193:
/***/ ((module) => {

"use strict";
module.exports = require("@emotion/react/jsx-runtime");

/***/ }),

/***/ 97:
/***/ ((module) => {

"use strict";
module.exports = require("@sentry/nextjs");

/***/ }),

/***/ 689:
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(484), __webpack_exec__(107), __webpack_exec__(343));
module.exports = __webpack_exports__;

})();
//# sourceMappingURL=_error.js.map