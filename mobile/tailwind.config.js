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
        small: '0 1px 3px rgba(20, 33, 61, 0.06)',
        medium: '0 3px 8px rgba(20, 33, 61, 0.1)'
      }
    }
  },
  plugins: []
};
