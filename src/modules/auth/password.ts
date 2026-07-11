import bcrypt from 'bcrypt';

const HASH_COST = 10;
const DUMMY_HASH = '$2b$10$KeMY1b2F/38B.6xM9QeYt.S76eR/tE6v7Gg1s1w8uF2A6r6z7e2rK';

export async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, HASH_COST);
}

export async function compare(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function dummyCompare(): Promise<void> {
  await bcrypt.compare('dummy_password', DUMMY_HASH);
}
