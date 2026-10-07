declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ADMIN_PIN?: string;
    BUCKET?: R2Bucket;
  }
}
