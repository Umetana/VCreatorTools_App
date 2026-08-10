(function (global) {
  'use strict';
  global.MARO_V2_LEGACY = {
    config: typeof CONFIG !== 'undefined' ? CONFIG : null,
    data: typeof MARO_DATA !== 'undefined' ? MARO_DATA : null
  };
})(window);
