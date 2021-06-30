// https://unpkg.com/commons-math-interpolation@2.2.2/Index.js
// https://github.com/chdh/commons-math-interpolation

// From UTILS
//https://unpkg.com/commons-math-interpolation@2.2.2/Utils.js

function evaluatePolySegment(xVals, segmentCoeffs, x) {
    let i = binarySearch(xVals, x);
    if (i < 0) {
        i = -i - 2;
    }
    i = Math.max(0, Math.min(i, segmentCoeffs.length - 1));
    return evaluatePoly(segmentCoeffs[i], x - xVals[i]);
}

function evaluatePoly(c, x) {
    const n = c.length;
    if (n == 0) {
        return 0;
    }
    let v = c[n - 1];
    for (let i = n - 2; i >= 0; i--) {
        v = x * v + c[i];
    }
    return v;
}

function trimPoly(c) {
    let n = c.length;
    while (n > 1 && c[n - 1] == 0) {
        n--;
    }
    return (n == c.length) ? c : c.subarray(0, n);
}

function checkMonotonicallyIncreasing(a) {
    for (let i = 0; i < a.length; i++) {
        if (!isFinite(a[i])) {
            throw new Error("Non-finite number detected.");
        }
        if (i > 0 && a[i] < a[i - 1]) {
            throw new Error("Number sequence is not monotonically increasing.");
        }
    }
}

function checkStrictlyIncreasing(a) {
    for (let i = 0; i < a.length; i++) {
        if (!isFinite(a[i])) {
            throw new Error("Non-finite number detected.");
        }
        if (i > 0 && a[i] <= a[i - 1]) {
            throw new Error("Number sequence is not strictly increasing.");
        }
    }
}

function checkFinite(a) {
    for (let i = 0; i < a.length; i++) {
        if (!isFinite(a[i])) {
            throw new Error("Non-finite number detected.");
        }
    }
}

function binarySearch(a, key) {
    let low = 0;
    let high = a.length - 1;
    while (low <= high) {
        const mid = (low + high) >>> 1;
        const midVal = a[mid];
        if (midVal < key) {
            low = mid + 1;
        } else if (midVal > key) {
            high = mid - 1;
        } else if (midVal == key) {
            return mid;
        } else {
            throw new Error("Invalid number encountered in binary search.");
        }
    }
    return -(low + 1);
}

function getMedian(a) {
    const n = a.length;
    if (n < 1) {
        return NaN;
    }
    const a2 = new Float64Array(a);
    a2.sort();
    const m = Math.floor(n / 2);
    if (n % 2 == 0) {
        return (a2[m - 1] + a2[m]) / 2;
    } else {
        return a2[m];
    }
}

// FROM AKIMA:
// https://unpkg.com/commons-math-interpolation@2.2.2/Akima.js
// import { checkStrictlyIncreasing, trimPoly, evaluatePolySegment } from "./Utils";
const EPSILON = Number.EPSILON;

export function createAkimaSplineInterpolator(xVals, yVals) {
    const segmentCoeffs = computeAkimaPolyCoefficients(xVals, yVals);
    const xValsCopy = Float64Array.from(xVals);
    return (x) => evaluatePolySegment(xValsCopy, segmentCoeffs, x);
}

function computeAkimaPolyCoefficients(xVals, yVals) {
    if (xVals.length != yVals.length) {
        throw new Error("Dimension mismatch for xVals and yVals.");
    }
    if (xVals.length < 5) {
        throw new Error("Number of points is too small.");
    }
    checkStrictlyIncreasing(xVals);
    const n = xVals.length - 1;
    const differences = new Float64Array(n);
    const weights = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        differences[i] = (yVals[i + 1] - yVals[i]) / (xVals[i + 1] - xVals[i]);
    }
    for (let i = 1; i < n; i++) {
        weights[i] = Math.abs(differences[i] - differences[i - 1]);
    }
    const firstDerivatives = new Float64Array(n + 1);
    for (let i = 2; i < n - 1; i++) {
        const wP = weights[i + 1];
        const wM = weights[i - 1];
        if (Math.abs(wP) < EPSILON && Math.abs(wM) < EPSILON) {
            const xv = xVals[i];
            const xvP = xVals[i + 1];
            const xvM = xVals[i - 1];
            firstDerivatives[i] = (((xvP - xv) * differences[i - 1]) + ((xv - xvM) * differences[i])) / (xvP - xvM);
        } else {
            firstDerivatives[i] = ((wP * differences[i - 1]) + (wM * differences[i])) / (wP + wM);
        }
    }
    firstDerivatives[0] = differentiateThreePoint(xVals, yVals, 0, 0, 1, 2);
    firstDerivatives[1] = differentiateThreePoint(xVals, yVals, 1, 0, 1, 2);
    firstDerivatives[n - 1] = differentiateThreePoint(xVals, yVals, n - 1, n - 2, n - 1, n);
    firstDerivatives[n] = differentiateThreePoint(xVals, yVals, n, n - 2, n - 1, n);
    return computeHermitePolyCoefficients(xVals, yVals, firstDerivatives);
}

function differentiateThreePoint(xVals, yVals, indexOfDifferentiation, indexOfFirstSample, indexOfSecondsample, indexOfThirdSample) {
    const x0 = yVals[indexOfFirstSample];
    const x1 = yVals[indexOfSecondsample];
    const x2 = yVals[indexOfThirdSample];
    const t = xVals[indexOfDifferentiation] - xVals[indexOfFirstSample];
    const t1 = xVals[indexOfSecondsample] - xVals[indexOfFirstSample];
    const t2 = xVals[indexOfThirdSample] - xVals[indexOfFirstSample];
    const a = (x2 - x0 - (t2 / t1 * (x1 - x0))) / (t2 * t2 - t1 * t2);
    const b = (x1 - x0 - a * t1 * t1) / t1;
    return (2 * a * t) + b;
}

function computeHermitePolyCoefficients(xVals, yVals, firstDerivatives) {
    if (xVals.length != yVals.length || xVals.length != firstDerivatives.length) {
        throw new Error("Dimension mismatch");
    }
    if (xVals.length < 2) {
        throw new Error("Not enough points.");
    }
    const n = xVals.length - 1;
    const segmentCoeffs = new Array(n);
    for (let i = 0; i < n; i++) {
        const w = xVals[i + 1] - xVals[i];
        const w2 = w * w;
        const yv = yVals[i];
        const yvP = yVals[i + 1];
        const fd = firstDerivatives[i];
        const fdP = firstDerivatives[i + 1];
        const coeffs = new Float64Array(4);
        coeffs[0] = yv;
        coeffs[1] = firstDerivatives[i];
        coeffs[2] = (3 * (yvP - yv) / w - 2 * fd - fdP) / w;
        coeffs[3] = (2 * (yv - yvP) / w + fd + fdP) / w2;
        segmentCoeffs[i] = trimPoly(coeffs);
    }
    return segmentCoeffs;
}

// --------------------------------------------------------------------------------------------

//   const xVals = [1, 3, 7, 8, 9, 10];
//   const yVals = [1, 5, -3, 0, 5, 0];
//   const interpolator = createAkimaSplineInterpolator(xVals, yVals);

//   const x = [0.0000,0.5000,1.0000,1.5000,2.0000,2.5000,3.0000,3.5000,4.0000,4.5000,5.0000,5.5000,6.0000,6.5000,7.0000,7.5000,8.0000,8.5000,9.0000,9.5000,10.0000];
//   var true_results= [0,0,1.0000,2.7292,3.9444,4.6875,5.0000,4.6684,3.6250,2.1302,0.4444,-1.1719,-2.4583,-3.1545,-3.0000,-1.8869,0.0000,2.3036,5.0000,0,0];

//   let result = new Array(x.length);
//   for (let i = 0; i < x.length; i++) {
//     result[i] = interpolator(x[i]);
//     console.log(x[i],result[i],true_results[i]);
//   }

//   document.getElementById("result").innerHTML = result;
//   document.getElementById("true").innerHTML = true_results;

// LOESS
// import { checkMonotonicallyIncreasing, checkFinite, getMedian } from "./Utils";

export function createLoessInterpolator(parms) {
    const diagInfo = false;
    // xVals, yVals, weights, bandwidthFraction = 0.3, robustnessIters = 2, accuracy = 1E-12, outlierDistanceFactor = 6, diagInfo } = parms;
    const { minXDistance = getDefaultMinXDistance(parms.xVals)} = parms;
    
    const fitYVals = smooth(parms);
    const knotFilter = createKnotFilter(parms.xVals, fitYVals, minXDistance);
    const knotXVals = filterNumberArray(parms.xVals, knotFilter);
    const knotYVals = filterNumberArray(fitYVals, knotFilter);
    if (diagInfo) {
        diagInfo.fitYVals = fitYVals;
        diagInfo.knotFilter = knotFilter;
        diagInfo.knotXVals = knotXVals;
        diagInfo.knotYVals = knotYVals;
    }
    return createAkimaSplineInterpolator(knotXVals, knotYVals);
}
function createKnotFilter(xVals, fitYVals, minXDistance) {
    const n = xVals.length;
    const filter = Array(n);
    let prevX = -Infinity;
    for (let i = 0; i < n; i++) {
        const x = xVals[i];
        const y = fitYVals[i];
        if (x - prevX >= minXDistance && !isNaN(y)) {
            filter[i] = true;
            prevX = x;
        }
        else {
            filter[i] = false;
        }
    }
    return filter;
}
function filterNumberArray(a, filter) {
    const n = a.length;
    const a2 = new Float64Array(n);
    let n2 = 0;
    for (let i = 0; i < n; i++) {
        if (filter[i]) {
            a2[n2++] = a[i];
        }
    }
    return a2.subarray(0, n2);
}
function getDefaultMinXDistance(xVals) {
    const n = xVals.length;
    if (n == 0) {
        return NaN;
    }
    const xRange = xVals[n - 1] - xVals[0];
    if (xRange == 0) {
        return 1;
    }
    return xRange / 100;
}
export function smooth(parms) {
    const { xVals, yVals, weights, bandwidthFraction = 0.3, robustnessIters = 2, accuracy = 1E-12, outlierDistanceFactor = 6, diagInfo } = parms;
    checkMonotonicallyIncreasing(xVals);
    checkFinite(yVals);
    if (weights) {
        checkFinite(weights);
    }
    const n = xVals.length;
    if (yVals.length != n || weights && weights.length != n) {
        throw new Error("Dimension mismatch.");
    }
    if (diagInfo) {
        diagInfo.robustnessIters = 0;
        diagInfo.secondLastMedianResidual = undefined;
        diagInfo.lastMedianResidual = undefined;
        diagInfo.robustnessWeights = undefined;
    }
    if (n <= 2) {
        return Float64Array.from(yVals);
    }
    let fitYVals = undefined;
    for (let iter = 0; iter <= robustnessIters; iter++) {
        let robustnessWeights = undefined;
        if (iter > 0) {
            const residuals = absDiff(fitYVals, yVals);
            const medianResidual = getMedian(residuals);
            if (medianResidual < accuracy) {
                if (diagInfo) {
                    diagInfo.lastMedianResidual = medianResidual;
                }
                break;
            }
            const outlierDistance = medianResidual * outlierDistanceFactor;
            robustnessWeights = calculateRobustnessWeights(residuals, outlierDistance);
            if (diagInfo) {
                diagInfo.robustnessIters = iter;
                diagInfo.secondLastMedianResidual = medianResidual;
                diagInfo.robustnessWeights = robustnessWeights;
            }
        }
        const combinedWeights = combineWeights(weights, robustnessWeights);
        fitYVals = calculateSequenceRegression(xVals, yVals, combinedWeights, bandwidthFraction, accuracy, iter);
    }
    return fitYVals;
}
function calculateSequenceRegression(xVals, yVals, weights, bandwidthFraction, accuracy, iter) {
    const n = xVals.length;
    const n2 = weights ? countNonZeros(weights) : n;
    if (n2 < 2) {
        throw new Error(`Not enough relevant points in iteration ${iter}.`);
    }
    const bandwidthInPoints = Math.max(2, Math.min(n2, Math.round(n2 * bandwidthFraction)));
    const bw = findInitialBandwidthInterval(weights, bandwidthInPoints, n);
    const fitYVals = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const x = xVals[i];
        moveBandwidthInterval(bw, x, xVals, weights);
        fitYVals[i] = calculateLocalLinearRegression(xVals, yVals, weights, x, bw.iLeft, bw.iRight, accuracy);
    }
    return fitYVals;
}
export function calculateLocalLinearRegression(xVals, yVals, weights, x, iLeft, iRight, accuracy) {
    let maxDist = Math.max(x - xVals[iLeft], xVals[iRight] - x) * 1.001;
    if (maxDist < 0) {
        throw new Error("Inconsistent bandwidth parameters.");
    }
    if (maxDist == 0) {
        maxDist = 1;
    }
    let sumWeights = 0;
    let sumX = 0;
    let sumXSquared = 0;
    let sumY = 0;
    let sumXY = 0;
    for (let k = iLeft; k <= iRight; ++k) {
        const xk = xVals[k];
        const yk = yVals[k];
        const dist = Math.abs(xk - x);
        const w1 = weights ? weights[k] : 1;
        const w2 = triCube(dist / maxDist);
        const w = w1 * w2;
        const xkw = xk * w;
        sumWeights += w;
        sumX += xkw;
        sumXSquared += xk * xkw;
        sumY += yk * w;
        sumXY += yk * xkw;
    }
    if (sumWeights < 1E-12) {
        return NaN;
    }
    const meanX = sumX / sumWeights;
    const meanY = sumY / sumWeights;
    const meanXY = sumXY / sumWeights;
    const meanXSquared = sumXSquared / sumWeights;
    const meanXSqrDiff = meanXSquared - meanX * meanX;
    let beta;
    if (Math.abs(meanXSqrDiff) < Math.pow(accuracy, 2)) {
        beta = 0;
    }
    else {
        beta = (meanXY - meanX * meanY) / meanXSqrDiff;
    }
    return meanY + beta * x - beta * meanX;
}
function findInitialBandwidthInterval(weights, bandwidthInPoints, n) {
    const iLeft = findNonZero(weights, 0);
    if (iLeft >= n) {
        throw new Error("Initial bandwidth start point not found.");
    }
    let iRight = iLeft;
    for (let i = 0; i < bandwidthInPoints - 1; i++) {
        iRight = findNonZero(weights, iRight + 1);
        if (iRight >= n) {
            throw new Error("Initial bandwidth end point not found.");
        }
    }
    return { iLeft, iRight };
}
function moveBandwidthInterval(bw, x, xVals, weights) {
    const n = xVals.length;
    while (true) {
        const nextRight = findNonZero(weights, bw.iRight + 1);
        if (nextRight >= n || xVals[nextRight] - x >= x - xVals[bw.iLeft]) {
            return;
        }
        bw.iLeft = findNonZero(weights, bw.iLeft + 1);
        bw.iRight = nextRight;
    }
}
function calculateRobustnessWeights(residuals, outlierDistance) {
    const n = residuals.length;
    const robustnessWeights = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        robustnessWeights[i] = biWeight(residuals[i] / outlierDistance);
    }
    return robustnessWeights;
}
function combineWeights(w1, w2) {
    if (!w1 || !w2) {
        return w1 !== null && w1 !== void 0 ? w1 : w2;
    }
    const n = w1.length;
    const a = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        a[i] = w1[i] * w2[i];
    }
    return a;
}
function findNonZero(a, startPos) {
    if (!a) {
        return startPos;
    }
    const n = a.length;
    let i = startPos;
    while (i < n && a[i] == 0) {
        i++;
    }
    return i;
}
function countNonZeros(a) {
    let cnt = 0;
    for (let i = 0; i < a.length; i++) {
        if (a[i] != 0) {
            cnt++;
        }
    }
    return cnt;
}
function absDiff(a1, a2) {
    const n = a1.length;
    const a3 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        a3[i] = Math.abs(a1[i] - a2[i]);
    }
    return a3;
}
function triCube(x) {
    const absX = Math.abs(x);
    if (absX >= 1) {
        return 0;
    }
    const tmp = 1 - absX * absX * absX;
    return tmp * tmp * tmp;
}
function biWeight(x) {
    const absX = Math.abs(x);
    if (absX >= 1) {
        return 0;
    }
    const tmp = 1 - absX * absX;
    return tmp * tmp;
}