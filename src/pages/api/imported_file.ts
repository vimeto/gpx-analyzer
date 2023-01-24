import { NextApiHandler } from "next";
import formidable from 'formidable';
import fs from 'fs';
import gpxParser from 'gpxparser';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler: NextApiHandler = async (req, res) => {
  if (req.method != "POST") {
    res.status(405).send({ message: "Only POST allowed" }); return;
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.log("error reading the files");
      res.status(500).end(); return;
    }

    if (files.file && !(files.file as formidable.File[])?.length) {
      const f = files.file as formidable.File;

      const file = fs.readFileSync(f.filepath, 'utf-8');
      const gpx = new gpxParser();
      gpx.parse(file);

      const firstTrack = gpx.tracks[0];

      console.log(gpx.tracks.length)

      const points = firstTrack.points;

      let minLon = Number.MAX_VALUE, maxLon = Number.MIN_VALUE;
      let minLat = Number.MAX_VALUE, maxLat = Number.MIN_VALUE;

      points.forEach((point) => {
        if (point.lon < minLon) minLon = point.lon;
        if (point.lon > maxLon) maxLon = point.lon;
        if (point.lat < minLat) minLat = point.lat;
        if (point.lat > maxLat) maxLat = point.lat;
      });

      res.status(200).json({ points, min: { lat: minLat, lon: minLon }, max: { lat: maxLat, lon: maxLon } }); return;
    }

    else {
      res.status(500).end(); return;
    }
  });
}

export default handler;
