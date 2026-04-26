export function distortNarrativeForHai(
  content: string,
  levels: { xueZao: number; muZhang: number },
): string {
  let out = content

  if (levels.xueZao >= 45) {
    out = out.replace(/\*([^*]+)\*/, '[$1]')
  }

  if (levels.muZhang >= 55) {
    out = out.replace(/\[[^\]]+\]/, '……')
  }

  return out
}
