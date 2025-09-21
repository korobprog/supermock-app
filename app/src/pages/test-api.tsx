import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function TestApiPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    console.log('Testing API connection to http://localhost:4000/matching/interviewers');
    try {
      const response = await fetch('http://localhost:4000/matching/interviewers');
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log('API response:', result);
      setData(result);
    } catch (err) {
      console.error('API error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      testApi();
    }
  }, []);

  return (
    <>
      <Head>
        <title>API Test · SuperMock</title>
      </Head>
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-white">API Test</h1>
          <p className="text-sm text-slate-400">Testing API connection</p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">API Test Results</h2>
            <button
              onClick={testApi}
              disabled={loading}
              className="mt-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {loading ? 'Testing...' : 'Test API'}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/40 p-4">
              <h3 className="text-red-300 font-semibold">Error:</h3>
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {data && (
            <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 p-4">
              <h3 className="text-emerald-300 font-semibold mb-2">Success! Data received:</h3>
              <pre className="text-emerald-200 text-sm overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
