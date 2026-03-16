const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  // Build main extension
  const extensionCtx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    minifyWhitespace: production,
    minifyIdentifiers: production,
    minifySyntax: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    target: ['node18'],
    legalComments: 'none',
    drop: production ? ['debugger'] : [],
    treeShaking: true,
    outfile: 'out/extension.js',
    // mark a few optional runtime libraries external so esbuild
    // doesn't try to resolve them during the build.  they are loaded
    // dynamically by ModuleLoader and may not be present in the root
    // package.json.
    external: ['vscode', 'lodash', 'moment', 'tv4', 'ajv'],
    logLevel: 'info',
  });

  // Build request-tester webview bundle
  const requestTesterCtx = await esbuild.context({
    entryPoints: ['resources/features/request-tester/modules/main.js'],
    bundle: true,
    format: 'iife',
    minify: production,
    minifyWhitespace: production,
    minifyIdentifiers: production,
    minifySyntax: production,
    sourcemap: !production,
    platform: 'browser',
    target: ['es2020'],
    legalComments: 'none',
    drop: production ? ['console', 'debugger'] : [],
    outfile: 'resources/features/request-tester/bundle.js',
    logLevel: 'info',
  });

  // Build test-suite webview bundle
  const testSuiteCtx = await esbuild.context({
    entryPoints: ['resources/features/test-suite/modules/main.js'],
    bundle: true,
    format: 'iife',
    minify: production,
    minifyWhitespace: production,
    minifyIdentifiers: production,
    minifySyntax: production,
    sourcemap: !production,
    platform: 'browser',
    target: ['es2020'],
    legalComments: 'none',
    drop: production ? ['console', 'debugger'] : [],
    outfile: 'resources/features/test-suite/bundle.js',
    logLevel: 'info',
  });

  if (watch) {
    await Promise.all([
      extensionCtx.watch(), 
      requestTesterCtx.watch(),
      testSuiteCtx.watch()
    ]);
    console.log('[HTTP Forge] Watching for changes...');
  } else {
    await Promise.all([
      extensionCtx.rebuild(), 
      requestTesterCtx.rebuild(),
      testSuiteCtx.rebuild()
    ]);
    await Promise.all([
      extensionCtx.dispose(), 
      requestTesterCtx.dispose(),
      testSuiteCtx.dispose()
    ]);
    console.log('[HTTP Forge] Build complete');
  }
}

main().catch(e => {
  console.error('[HTTP Forge] Build failed:', e);
  process.exit(1);
});
