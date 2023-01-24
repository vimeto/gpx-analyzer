// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Point } from 'gpxparser';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { checkIntersection } from 'line-intersect';
import { colors } from '@/colors';

const turn = (p1: Point, p2: Point, p3: Point) => {
  const a = p1.lon, b = p1.lat;
  const c = p2.lon, d = p2.lat;
  const e = p3.lon, f = p3.lat;
  const A = (f - b) * (c - a);
  const B = (d - b) * (e - a);
  return (A > B + Number.EPSILON) ? 1 : (A + Number.EPSILON < B) ? -1 : 0;
}

const intersects = (p1: Point, p2: Point, p3: Point, p4: Point) => {
  return (turn(p1, p3, p4) != turn(p2, p3, p4)) && (turn(p1, p2, p3) != turn(p1, p2, p4));
}

const getPoint = (longitude: number, latitude: number) => {
  return { lat: latitude, lon: longitude, ele: 0, time: new Date(0) };
}

const handler: NextApiHandler = async (req, res) => {
  if (req.method != "POST") {
    res.status(405).send({ message: "Only POST allowed" }); return;
  }

  const body = JSON.parse(req.body);

  const points = body.points as Point[];
  points.forEach((point) => { point.time = new Date(point.time); });
  const checkPoints = body.checkPoints as number[][];

  let intersections: Point[] = [];

  for (let i = 1; i < points.length; i++) {
    for (let j = 0; j < checkPoints.length; j++) {
      const p1 = points[i - 1], p2 = points[i];
      const p3 = getPoint(checkPoints[j][0], checkPoints[j][1]), p4 = getPoint(checkPoints[j][2], checkPoints[j][3]);
      if (intersects(p1, p2, p3, p4)) {
        intersections.push(points[i]);
      }
    }
  }

  intersections.sort((a, b) => {
    return a.time.getTime() - b.time.getTime();
  });

  type Segment = {
    distance: number,
    id: number,
    time: number, // milliseconds
    color: string, // in hex
    points: Point[]
  }
  const segments: Segment[] = [];

  //

  let previousIntersectionIndex = 0;
  let segmentIndex = 0;
  let segmentDistance = 0;
  let totalDistance = 0;
  const R = 6371000;
  for (let i = 1; i < points.length; i++) {
    // calculate distance to previous point using equirectangular approximation
    const λ1 = points[i - 1].lon * Math.PI / 180;
    const λ2 = points[i].lon * Math.PI / 180;
    const φ1 = points[i - 1].lat * Math.PI / 180;
    const φ2 = points[i].lat * Math.PI / 180;
    const x = (λ2 - λ1) * Math.cos((φ1 + φ2) / 2);
    const y = (φ2 - φ1);
    const distance = Math.sqrt(x * x + y * y) * R;

    totalDistance += distance;
    segmentDistance += distance;

    for (let j = 0; j < intersections.length; j++) {
      const segmentStart = points[previousIntersectionIndex];
      const segmentEnd = points[i - 1];

      if (points[i].time.getTime() === intersections[j].time.getTime()) {
        const segmentTime = segmentEnd.time.getTime() - segmentStart.time.getTime();

        const segment = {
          distance: segmentDistance,
          time: segmentTime,
          color: colors[j % colors.length],
          id: j,
          points: points.slice(previousIntersectionIndex, i - 1),
        };
        segments.push(segment);

        // console.log(`Segment no. ${segmentIndex} segment ${previousIntersectionIndex} - ${i - 1}, time: ${segmentTime} s`);
        // console.log(`Segment distance: ${segmentDistance} m`);
        segmentDistance = 0;
        segmentIndex++;
        previousIntersectionIndex = i;
      }
    }
  }

  const segmentStart = points[previousIntersectionIndex];
  const segmentEnd = points[points.length - 1];
  const segmentTime = segmentEnd.time.getTime() - segmentStart.time.getTime();

  const segment = {
    distance: segmentDistance,
    time: segmentTime,
    color: colors[intersections.length % colors.length],
    id: intersections.length,
    points: points.slice(previousIntersectionIndex, points.length - 1)
  };
  segments.push(segment);

  const totalTime = (points[points.length - 1].time.getTime() - points[0].time.getTime());

  console.log(`Total distance: ${totalDistance} m`);
  console.log(`Total time: ${totalTime} ms`);

  res.status(200).json({ segments, totalTime, totalDistance });
}

export default handler;
