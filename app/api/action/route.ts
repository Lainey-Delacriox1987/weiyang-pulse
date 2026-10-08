import { submitAction } from "@/lib/market";

export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    return Response.json(await submitAction(input));
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失败，请稍后重试。";
    const clientError = !/database|sql|binding|d1/i.test(message);
    if (!clientError) console.error(error);
    return Response.json({ error: clientError ? message : "现场数据暂时不可用，请稍后重试。" }, { status: clientError ? 400 : 500 });
  }
}
