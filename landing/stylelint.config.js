export default {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-tailwindcss'
  ],
  rules: {
    // Allow Tailwind's @apply directive
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'layer'
        ]
      }
    ],
    // Allow CSS custom properties (CSS variables)
    'property-no-unknown': [
      true,
      {
        ignoreProperties: [
          // Allow CSS custom properties
          '/^--/'
        ]
      }
    ],
    // Allow Tailwind's arbitrary value syntax
    'declaration-block-no-redundant-longhand-properties': null,
    // Allow empty rules for Tailwind's @layer directive
    'block-no-empty': null,
    // Allow single-line rules for Tailwind utilities
    'rule-empty-line-before': null
  }
}
