export default async function handler(req: any, res: any) {
  res.status(410).json({ error: 'PDF rendering disabled. Use Markdown export instead.' });
}
