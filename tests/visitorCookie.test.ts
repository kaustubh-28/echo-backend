import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app';
import { VISITOR_COOKIE_NAME } from '../src/shared/services/visitor.types';

describe('Visitor cookie middleware', () => {
  it('should set a signed echo_visitor cookie for new visitors', async () => {
    const response = await request(app).get('/api/v1/health/live');

    expect(response.status).toBe(200);

    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(
      setCookie?.some(
        (header) =>
          header.startsWith(`${VISITOR_COOKIE_NAME}=s%3A`) ||
          header.startsWith(`${VISITOR_COOKIE_NAME}=s:`),
      ),
    ).toBe(true);
    expect(setCookie?.some((header) => header.includes('HttpOnly'))).toBe(true);
    expect(setCookie?.some((header) => header.includes('SameSite=Lax'))).toBe(true);
  });

  it('should reuse an existing visitor cookie without issuing a new one', async () => {
    const firstResponse = await request(app).get('/api/v1/health/live');
    const cookieHeader = firstResponse.headers['set-cookie']?.[0];

    expect(cookieHeader).toBeDefined();

    const cookiePair = cookieHeader!.split(';')[0];

    const secondResponse = await request(app)
      .get('/api/v1/health/live')
      .set('Cookie', cookiePair!);

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.headers['set-cookie']).toBeUndefined();
  });
});
