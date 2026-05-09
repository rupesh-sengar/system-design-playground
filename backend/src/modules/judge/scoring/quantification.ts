export const hasQuantification = (text: string): boolean => {
  const patterns = [
    /\b\d+(\.\d+)?\s*(ms|millisecond|milliseconds)\b/i,
    /\b\d+(\.\d+)?\s*(s|sec|second|seconds)\b/i,
    /\b\d+(\.\d+)?\s*%\b/i,
    /\b\d+(\.\d+)?\s*(qps|rps|req\/s|requests per second)\b/i,
    /\b\d+(\.\d+)?\s*(k|m|b|kb|mb|gb|tb|pb)\b/i,
    /\b\d+(\.\d+)?\s*(thousand|million|billion|trillion)\b/i,
    /\b\d+(\.\d+)?\s*(users|active users|million users|billion users)\b/i,
    /\b\d+(\.\d+)?\s*(keys|events|messages|requests|redirects|snippets|objects|files|orders|transactions|writes|reads|sends|pushes)\b/i,
    /\b(hundreds of millions|tens of millions|millions|billions|petabytes?|exabytes?|tb-scale|pb-scale)\b/i,
    /\b(p95|p99|sla|slo|rpo|rto)\b/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
};
