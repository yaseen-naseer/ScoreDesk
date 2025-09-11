/**
 * API testing helper functions
 */

import { Page } from '@playwright/test'

/**
 * Helper to mock API responses for testing
 */
export class ApiMocker {
  private page: Page
  private mocks: Map<string, any> = new Map()

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Mock a successful API response
   */
  async mockSuccess(url: string | RegExp, data: any, status = 200) {
    await this.page.route(url, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
    })
    
    this.mocks.set(url.toString(), { data, status })
  }

  /**
   * Mock an API error response
   */
  async mockError(url: string | RegExp, error: any, status = 500) {
    await this.page.route(url, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error }),
      })
    })
    
    this.mocks.set(url.toString(), { error, status })
  }

  /**
   * Mock Supabase authentication success
   */
  async mockAuthSuccess(user: any, session: any) {
    await this.mockSuccess('**/auth/v1/token*', {
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user,
    })

    await this.mockSuccess('**/auth/v1/user*', { user })
  }

  /**
   * Mock Supabase authentication error
   */
  async mockAuthError(message = 'Invalid credentials') {
    await this.mockError('**/auth/v1/token*', {
      error: 'invalid_grant',
      error_description: message,
    }, 400)
  }

  /**
   * Mock Supabase database query success
   */
  async mockDatabaseQuery(table: string, data: any[], count?: number) {
    await this.mockSuccess(`**/rest/v1/${table}*`, data)
    
    if (count !== undefined) {
      await this.page.route(`**/rest/v1/${table}*`, (route) => {
        const headers = route.request().headers()
        if (headers['prefer']?.includes('count=exact')) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(data),
            headers: {
              'Content-Range': `0-${data.length - 1}/${count}`,
            },
          })
        } else {
          route.continue()
        }
      })
    }
  }

  /**
   * Mock Supabase database insert success
   */
  async mockDatabaseInsert(table: string, data: any) {
    await this.mockSuccess(`**/rest/v1/${table}*`, data, 201)
  }

  /**
   * Mock Supabase database update success
   */
  async mockDatabaseUpdate(table: string, data: any) {
    await this.mockSuccess(`**/rest/v1/${table}*`, data, 200)
  }

  /**
   * Mock Supabase database delete success
   */
  async mockDatabaseDelete(table: string) {
    await this.mockSuccess(`**/rest/v1/${table}*`, {}, 204)
  }

  /**
   * Mock Supabase storage upload success
   */
  async mockStorageUpload(bucket: string, fileName: string) {
    await this.mockSuccess(`**/storage/v1/object/${bucket}/${fileName}*`, {
      Key: `${bucket}/${fileName}`,
      ETag: 'mock-etag',
    })
  }

  /**
   * Mock network delay
   */
  async mockDelay(url: string | RegExp, delayMs: number) {
    await this.page.route(url, async (route) => {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      route.continue()
    })
  }

  /**
   * Mock network failure
   */
  async mockNetworkFailure(url: string | RegExp) {
    await this.page.route(url, (route) => {
      route.abort('failed')
    })
  }

  /**
   * Clear all mocks
   */
  async clearMocks() {
    await this.page.unrouteAll()
    this.mocks.clear()
  }

  /**
   * Get all registered mocks
   */
  getMocks() {
    return Array.from(this.mocks.entries())
  }
}

/**
 * Common API response patterns
 */
export const ApiResponsePatterns = {
  // Supabase Auth responses
  authSuccess: (user: any) => ({
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'mock-refresh-token',
    user,
  }),

  authError: (message: string) => ({
    error: 'invalid_grant',
    error_description: message,
  }),

  // Supabase Database responses
  dbSuccess: (data: any[]) => data,

  dbError: (message: string, code = 'PGRST116') => ({
    code,
    details: null,
    hint: null,
    message,
  }),

  // Pagination response
  paginatedResponse: (data: any[], page: number, limit: number, total: number) => ({
    data,
    count: total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }),

  // Validation error
  validationError: (field: string, message: string) => ({
    error: 'validation_error',
    message: `Validation failed for field: ${field}`,
    details: {
      [field]: [message],
    },
  }),

  // Rate limit error
  rateLimitError: () => ({
    error: 'rate_limit_exceeded',
    message: 'Too many requests',
    retry_after: 60,
  }),
}

/**
 * Helper to create realistic API delays
 */
export const ApiDelays = {
  fast: 50,      // Very fast response
  normal: 200,   // Normal response time
  slow: 1000,    // Slow response
  timeout: 5000, // Simulated timeout
}

/**
 * Helper to mock real-time subscriptions
 */
export class RealtimeMocker {
  private page: Page
  private subscriptions: Map<string, any> = new Map()

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Mock a real-time subscription
   */
  async mockSubscription(channel: string, event: string, payload: any) {
    await this.page.evaluate(
      ({ channel, event, payload }) => {
        // Simulate real-time event
        window.dispatchEvent(new CustomEvent('supabase-realtime', {
          detail: { channel, event, payload }
        }))
      },
      { channel, event, payload }
    )

    this.subscriptions.set(`${channel}-${event}`, payload)
  }

  /**
   * Mock match updates in real-time
   */
  async mockMatchUpdate(matchId: string, updates: any) {
    await this.mockSubscription(
      `match:${matchId}`,
      'UPDATE',
      { id: matchId, ...updates }
    )
  }

  /**
   * Mock new match event
   */
  async mockMatchEvent(matchId: string, event: any) {
    await this.mockSubscription(
      `match:${matchId}`,
      'INSERT',
      { type: 'match_event', ...event }
    )
  }

  /**
   * Mock statistics update
   */
  async mockStatsUpdate(matchId: string, teamId: string, stats: any) {
    await this.mockSubscription(
      `match:${matchId}`,
      'UPDATE',
      { type: 'match_statistics', team_id: teamId, ...stats }
    )
  }

  /**
   * Clear all subscriptions
   */
  clearSubscriptions() {
    this.subscriptions.clear()
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.entries())
  }
}

/**
 * Helper to test API error handling
 */
export async function testApiErrorScenarios(
  page: Page,
  apiCall: () => Promise<void>,
  expectedErrorMessage?: string
) {
  const mocker = new ApiMocker(page)

  // Test network failure
  await mocker.mockNetworkFailure('**/*')
  await apiCall()
  // Check for offline/network error handling

  await mocker.clearMocks()

  // Test server error
  await mocker.mockError('**/*', 'Internal Server Error', 500)
  await apiCall()
  // Check for server error handling

  await mocker.clearMocks()

  // Test validation error
  await mocker.mockError('**/*', 'Validation failed', 400)
  await apiCall()
  // Check for validation error handling

  await mocker.clearMocks()

  // Test rate limiting
  await mocker.mockError('**/*', ApiResponsePatterns.rateLimitError(), 429)
  await apiCall()
  // Check for rate limit handling

  await mocker.clearMocks()
}
