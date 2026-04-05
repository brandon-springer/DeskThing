import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/out', '**/out-headless', '**/build'] },
  tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true
        }
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true
        }
      ]
    }
  },
  eslintConfigPrettier
)
