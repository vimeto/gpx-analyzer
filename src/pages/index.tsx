import Image from 'next/image'
import { Inter } from '@next/font/google'
import Button from '@mui/material/Button';
import Map, { MapRef } from 'react-map-gl';
import { Source, Layer } from 'react-map-gl';
import Head from 'next/head';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { TextField, Typography } from '@mui/material';
import { Box } from '@mui/system';
import { Point } from 'gpxparser';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

const inter = Inter({ subsets: ['latin'] })

type Segment = {
  distance: number, // meters
  id: number,
  time: number, // milliseconds
  color: string, // in hex
  points: Point[]
}

const getDataFromPoints = (points: Point[]) => {
  return {
    type: "LineString",
    coordinates: points.map(point => [point.lon, point.lat])
  } as GeoJSON.Geometry;
}

export default function Home() {
  const mapRef = useRef<MapRef>(null);

  const [points, setPoints] = useState<Point[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]); // TODO: use this, not points
  const [totalDistance, setTotalDistance] = useState(0); // meters
  const [totalTime, setTotalTime] = useState(0); // milliseconds

  const [checkPoints, setCheckPoints] = useState<number[][]>([]); // TODO: update to use points
  const [centeredOn, setCenteredOn] = useState([24.826347, 60.179913]); // [lon, lat]


  const updateCheckPoint = (value: string, index: number, coordIndex: number) => {
    const newCheckPoints = [...checkPoints];
    const updatedNumeral = parseFloat(value);
    if (isNaN(updatedNumeral)) {
      return;
    }
    newCheckPoints[index][coordIndex] = updatedNumeral;

    setCheckPoints(newCheckPoints);
  }

  const postCalculations = async () => {
    const res = await fetch('/api/calculations', {
      method: 'POST',
      body: JSON.stringify({
        points,
        checkPoints
      })
    });

    if (res.status > 200) { return; }

    const json = await res.json();

    setSegments(json.segments);
    setTotalDistance(json.totalDistance);
    setTotalTime(json.totalTime);
  }

  const uploadFile = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return;
    }

    const file = e.target.files[0];
    const data = new FormData();
    data.append('file', file);

    const res = await fetch('/api/imported_file', {
      method: 'POST',
      body: data
    });

    if (res.status > 200) { return; }

    const json = await res.json();

    setPoints(json.points);

    const min = json.min as Point;
    const max = json.max as Point;

    mapRef.current?.fitBounds(
      [
        [min.lon, min.lat],
        [max.lon, max.lat]
      ],
      { padding: 50, duration: 1000 }
    )
  }

  const columns: GridColDef[] = [
    { field: 'color', headerName: 'Color', flex: 1, renderCell: (params) => (
      <div style={{backgroundColor: params.value, width: 24, height: 24, borderRadius: '9999px'}} />
    ) },
    { field: 'distance', headerName: 'Distance', flex: 1, valueGetter: (params) => {
      const distance = Number(params.row.distance) || 0;
      return `${distance.toFixed(2)} m`;
    } },
    { field: 'time', headerName: 'Time', flex: 1, valueGetter: (params) => {
      const time = Number(params.row.time) || 0;
      const timeInSeconds = time / 1000;
      return `${timeInSeconds.toFixed(2)} s`;
    } },
    { field: 'speed', headerName: 'Speed', flex: 1, valueGetter: (params) => {
      const time = Number(params.row.time) || 0;
      const distance = Number(params.row.distance) || 0;
      const speedInMinutesPerKilometer = (time / (distance * 10)) / 6;
      return `${(speedInMinutesPerKilometer).toFixed(2)} min/km`;
      // return `${(distance / (time / 1000)).toFixed(2)} m/s`;
    } },
  ]

  return (
    <Box>
      <Head>
        <title>GPX analyzer</title>
      </Head>
      <Box sx={{ pb: 2 }}>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h2">GPX ANALYZER</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {points.length === 0 ? (
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
            >
              Upload GPX
              <input type="file" accept=".gpx" hidden onChange={uploadFile} />
            </Button>
          ) : segments.length === 0 && (
            <>
              <Button
                variant="outlined"
                onClick={() => setCheckPoints([...checkPoints, [points[0].lon, points[0].lat, points[0].lon, points[0].lat]])}
                >
                  Add a checkpoint
              </Button>
              <Button
                variant="outlined"
                onClick={postCalculations}
                >
                  Calculate
              </Button>
            </>
          )}
        </Box>
        {segments.length === 0 ? (
          <Box sx={{ py: 2 }}>
            {checkPoints.map((checkPoint, index) => (
              <Box
                component="form"
                noValidate
                autoComplete="off"
                key={index} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', py: 2 }}
                >
                <Box sx={{ fontSize: 24 }}>{`${index}.`}</Box>
                <TextField
                  // placeholder={'lon'}
                  label={'A: lon'}
                  value={checkPoints[index][0]}
                  type="number"
                  inputProps={{ step: 0.00001 }}
                  onChange={(e) => updateCheckPoint(e.target.value, index, 0)}
                  />
                <TextField
                  // placeholder={'lat'}
                  label={'A: lat'}
                  value={checkPoints[index][1]}
                  type="number"
                  inputProps={{ step: 0.00001 }}
                  onChange={(e) => updateCheckPoint(e.target.value, index, 1)}
                  />
                <TextField
                  // placeholder={'lon'}
                  label={'B: lon'}
                  value={checkPoints[index][2]}
                  type="number"
                  inputProps={{ step: 0.00001 }}
                  onChange={(e) => updateCheckPoint(e.target.value, index, 2)}
                  />
                <TextField
                  // placeholder={'lat'}
                  label={'B: lat'}
                  value={checkPoints[index][3]}
                  type="number"
                  inputProps={{ step: 0.00001 }}
                  onChange={(e) => updateCheckPoint(e.target.value, index, 3)}
                  />
              </Box>
            ))}
          </Box>
          ) : (
          <Box sx={{ py: 2 }}>
            <Box sx={{ fontSize: 24 }}>{`Total distance: ${totalDistance.toFixed(2)} m`}</Box>
            <Box sx={{ fontSize: 24 }}>{`Total time: ${(totalTime / 1000).toFixed(2)} s`}</Box>
            <Box sx={{ fontSize: 24 }}>{`Avg speed: ${((totalTime / (totalDistance * 10)) / 6).toFixed(2)} min/km`}</Box>
          </Box>
        )}
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.MapboxAccessTokenDev}
          initialViewState={{
            latitude: 60.179913,
            longitude: 24.826347,
            zoom: 14
          }}
          style={{width: '100%', height: 500}}
          mapStyle="mapbox://styles/mapbox/streets-v9"
        >
          {segments.length > 0 ? (
            segments.map((segment, index) => (
              <Source key={index} id={`polylineLayer${index}`} type="geojson" data={getDataFromPoints(segment.points)}>
                <Layer
                  id={`segment_linesegment${index}`}
                  type="line"
                  source={`polylineLayer${index}`}
                  layout={{
                    "line-join": "round",
                    "line-cap": "round"
                  }}
                  paint={{
                    "line-color": segment.color,
                    "line-width": 5
                  }}
                />
              </Source>
            ))
          ) : points.length > 0 && (
            <Source id="polylineLayer" type="geojson" data={getDataFromPoints(points)}>
              <Layer
                id="lineLayer"
                type="line"
                source="polylineLayer"
                layout={{
                  "line-join": "round",
                  "line-cap": "round"
                }}
                paint={{
                  "line-color": "rgba(0, 0, 0, 1)",
                  "line-width": 5
                }}
              />
            </Source>
          )}

          {segments.length == 0 && checkPoints.map((checkPoint, index) => {
            return (
              <Source key={index} id={`checkPoint${index}`} type="geojson" data={{
                type: "LineString",
                coordinates: [[checkPoint[0], checkPoint[1]], [checkPoint[2], checkPoint[3]]]
              }}
              >
                <Layer
                  id={`checkPointLayer${index}`}
                  type="line"
                  source={`checkPoint${index}`}
                  layout={{
                    "line-join": "round",
                    "line-cap": "round"
                  }}
                  paint={{
                    "line-color": "rgba(255, 0, 0, 1)",
                    "line-width": 8
                  }}
                />
              </Source>
          )})}
        </Map>
        {segments.length > 0 && (
          <Box style={{ height: 300 }}>
            <DataGrid rows={segments} columns={columns} />
          </Box>
        )}
      </Box>
    </Box>
  )
}
