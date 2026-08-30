/**
 * Cloudflare R2 Bucket Validation & Connectivity Utility
 * Validates presence, environment variables, format, and live connectivity
 * for both frontend user requests and backend sync operations.
 */

export interface R2Credentials {
  r2_account_id?: string;
  r2_access_key?: string;
  r2_secret_key?: string;
  r2_bucket_name?: string;
  r2_public_url?: string;
  local_storage_enabled?: boolean;
  primary_storage?: string;
}

export interface R2FieldSource {
  r2_account_id: 'env' | 'database' | 'none';
  r2_access_key: 'env' | 'database' | 'none';
  r2_secret_key: 'env' | 'database' | 'none';
  r2_bucket_name: 'env' | 'database' | 'none';
  r2_public_url: 'env' | 'database' | 'none';
}

export interface R2Diagnostics {
  credentialsPresent: boolean;
  bucketReachable: boolean;
  publicUrlConfigured: boolean;
  syncReady: boolean;
  corsOrPermissionOk?: boolean;
}

export interface R2ValidationResult {
  valid: boolean;
  connected: boolean;
  status: 'connected' | 'misconfigured' | 'error';
  message: string;
  missingFields: string[];
  latencyMs?: number;
  sources?: R2FieldSource;
  diagnostics: R2Diagnostics;
  config?: Partial<R2Credentials>;
  rawResponse?: any;
}

/**
 * Validates R2 bucket configuration and live connectivity.
 * Reads frontend form inputs and backend environment variables.
 * 
 * @param credentials Optional explicit credential overrides
 * @param token Optional admin JWT authentication token
 * @returns Promise<R2ValidationResult>
 */
export async function validateR2BucketConnection(
  credentials?: Partial<R2Credentials>,
  token?: string | null
): Promise<R2ValidationResult> {
  const missingFields: string[] = [];

  // Local preliminary validation
  if (credentials) {
    if (!credentials.r2_account_id?.trim()) missingFields.push('Account ID');
    if (!credentials.r2_access_key?.trim()) missingFields.push('Access Key ID');
    if (!credentials.r2_secret_key?.trim()) missingFields.push('Secret Access Key');
    if (!credentials.r2_bucket_name?.trim()) missingFields.push('Bucket Name');
  }

  try {
    const startTime = performance.now();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/admin/storage/r2/validate', {
      method: 'POST',
      headers,
      body: JSON.stringify(credentials || {})
    });

    const data = await res.json();
    const latencyMs = Math.round(performance.now() - startTime);

    if (!res.ok || !data.success) {
      return {
        valid: false,
        connected: false,
        status: data.missingFields?.length ? 'misconfigured' : 'error',
        message: data.error || data.message || 'R2 bucket validation failed',
        missingFields: data.missingFields || missingFields,
        latencyMs,
        sources: data.sources,
        diagnostics: data.diagnostics || {
          credentialsPresent: (data.missingFields || missingFields).length === 0,
          bucketReachable: false,
          publicUrlConfigured: !!(credentials?.r2_public_url || data.config?.r2_public_url),
          syncReady: false
        },
        config: data.config,
        rawResponse: data
      };
    }

    return {
      valid: true,
      connected: true,
      status: 'connected',
      message: data.message || 'Cloudflare R2 bucket connection verified successfully!',
      missingFields: [],
      latencyMs: data.latencyMs ?? latencyMs,
      sources: data.sources,
      diagnostics: data.diagnostics || {
        credentialsPresent: true,
        bucketReachable: true,
        publicUrlConfigured: !!(credentials?.r2_public_url || data.config?.r2_public_url),
        syncReady: true
      },
      config: data.config,
      rawResponse: data
    };
  } catch (err: any) {
    return {
      valid: false,
      connected: false,
      status: 'error',
      message: err.message || 'Network error while testing R2 connectivity',
      missingFields,
      diagnostics: {
        credentialsPresent: missingFields.length === 0,
        bucketReachable: false,
        publicUrlConfigured: !!credentials?.r2_public_url,
        syncReady: false
      }
    };
  }
}
