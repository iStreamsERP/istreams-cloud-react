export function cartesianProduct(arrays) {
    return arrays.reduce((acc, arr) =>
      acc.flatMap(a => arr.map(v => [...a, v])),
      [[]]
    );
  }
  