export default [{
  files: ["assets/**/*.js"],
  languageOptions: {
    ecmaVersion: 2015,
    sourceType: "script",
    globals: {
      window:"readonly", document:"readonly", console:"readonly", liff:"readonly",
      localStorage:"readonly", setTimeout:"readonly", clearTimeout:"readonly",
      fetch:"readonly", Promise:"readonly", JSON:"readonly", Math:"readonly",
      Date:"readonly", Array:"readonly", Object:"readonly", String:"readonly",
      Number:"readonly", Boolean:"readonly", RegExp:"readonly", isNaN:"readonly",
      encodeURIComponent:"readonly", decodeURIComponent:"readonly",
      parseInt:"readonly", parseFloat:"readonly", URLSearchParams:"readonly",
      crypto:"readonly", location:"readonly", history:"readonly", navigator:"readonly",
      AbortController:"readonly", Error:"readonly", TypeError:"readonly"
    }
  },
  rules: { "no-undef": "error" }
}];
