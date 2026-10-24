/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        /* brand palette */
        "brand-slate": "#2f4e78",
        "brand-gold": "#cd9e61",
        "brand-sand": "#f6e6d6",
        "brand-olive": "#b8a9be",
        "brand-sky": "#3b96da",
        /* semantic aliases */
        "royal-navy": "#0a1628",
        "deep-navy": "#2f4e78",
        gold: "#cd9e61",
        sand: "#f6e6d6",
        olive: "#b8a9be",
        sky: "#3b96da",
        /* depth shades derived from royal navy */
        "navy-975": "#030a13",
        "navy-950": "#050d18",
        "navy-900": "#07111c",
        "navy-850": "#050e18",
        "navy-800": "#0a1420",
      },
    },
  },
};
