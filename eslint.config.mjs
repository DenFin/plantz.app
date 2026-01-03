// eslint.config.mjs
import antfu from '@antfu/eslint-config'
// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({

  }, {
    rules: {
      'no-console': ['warn'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'vue/block-order': ['error', {
        order: [['template', 'script'], 'style'],
      }],
    },
  }),
)
