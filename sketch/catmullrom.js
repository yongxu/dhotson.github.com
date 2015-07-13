
/**
 * This uses either the chordal or centripetal parameterization of the catmull-rom algorithm.
 * By default, the centripetal parameterization is used because this gives the nicest results.
 * These parameterizations are relatively heavy because the distance between 4 points have to be calculated.
 *
 * One optimization can be used to reuse distances since this is a sliding window approach.
 * @param data
 * @private
 */
catmullRom = function(data) {
  var alpha = 0.5;
  var p0, p1, p2, p3, bp1, bp2, d1,d2,d3, A, B, N, M;
  var d3powA, d2powA, d3pow2A, d2pow2A, d1pow2A, d1powA;
  var length = data.length;
  var results = [];
  for (var i = 0; i < length - 1; i++) {

    p0 = (i == 0) ? data[0] : data[i-1];
    p1 = data[i];
    p2 = data[i+1];
    p3 = (i + 2 < length) ? data[i+2] : p2;

    d1 = Math.sqrt(Math.pow(p0.x - p1.x,2) + Math.pow(p0.y - p1.y,2));
    d2 = Math.sqrt(Math.pow(p1.x - p2.x,2) + Math.pow(p1.y - p2.y,2));
    d3 = Math.sqrt(Math.pow(p2.x - p3.x,2) + Math.pow(p2.y - p3.y,2));

    // Catmull-Rom to Cubic Bezier conversion matrix

    // A = 2d1^2a + 3d1^a * d2^a + d3^2a
    // B = 2d3^2a + 3d3^a * d2^a + d2^2a

    // [   0             1            0          0          ]
    // [   -d2^2a /N     A/N          d1^2a /N   0          ]
    // [   0             d3^2a /M     B/M        -d2^2a /M  ]
    // [   0             0            1          0          ]

    d3powA  = Math.pow(d3,  alpha);
    d3pow2A = Math.pow(d3,2*alpha);
    d2powA  = Math.pow(d2,  alpha);
    d2pow2A = Math.pow(d2,2*alpha);
    d1powA  = Math.pow(d1,  alpha);
    d1pow2A = Math.pow(d1,2*alpha);

    A = 2*d1pow2A + 3*d1powA * d2powA + d2pow2A;
    B = 2*d3pow2A + 3*d3powA * d2powA + d2pow2A;
    N = 3*d1powA * (d1powA + d2powA);
    if (N > 0) {N = 1 / N;}
    M = 3*d3powA * (d3powA + d2powA);
    if (M > 0) {M = 1 / M;}

    bp1 = { x: ((-d2pow2A * p0.x + A*p1.x + d1pow2A * p2.x) * N),
      y: ((-d2pow2A * p0.y + A*p1.y + d1pow2A * p2.y) * N)};

    bp2 = { x: (( d3pow2A * p1.x + B*p2.x - d2pow2A * p3.x) * M),
      y: (( d3pow2A * p1.y + B*p2.y - d2pow2A * p3.y) * M)};

    if (bp1.x == 0 && bp1.y == 0) {bp1 = p1;}
    if (bp2.x == 0 && bp2.y == 0) {bp2 = p2;}

    results.push({
      cp1: bp1,
      cp2: bp2,
      p1: p1,
      p2: p2,
    });
  }

  return results;
};
