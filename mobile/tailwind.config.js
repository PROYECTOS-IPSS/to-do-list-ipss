/* global require, module */
/* eslint-disable @typescript-eslint/no-require-imports */
const tokenData = require('./src/ui/tokens.json');

const pxScale = (values) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, `${value}px`]));
const fontScale = Object.fromEntries(Object.entries(tokenData.typography).map(([key, value]) => [key, [`${value.fontSize}px`, `${value.lineHeight}px`]]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: tokenData.colors,
      spacing: pxScale(tokenData.spacing),
      borderRadius: pxScale(tokenData.radius),
      fontSize: fontScale,
      boxShadow: {
        small: '0 1px 4px rgba(10, 7, 9, 0.2)',
        medium: '0 3px 8px rgba(10, 7, 9, 0.3)'
      }
    }
  },
  plugins: []
};
