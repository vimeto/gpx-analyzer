// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import gpxParser from 'gpxparser';
import fs from 'fs';
import path from 'path';

type Data = {
  coordinates: number[][]
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const gpxDirectory = path.join(process.cwd(), 'gpx');

  let gpx = new gpxParser();

  gpx.parse(fs.readFileSync(gpxDirectory + '/data.gpx', 'utf-8'));

  const firstTrack = gpx.tracks[0];

  let coords = firstTrack.points.map((point) => {
    return [point.lon, point.lat];
  });

  res.status(200).json({ coordinates: coords })
}
