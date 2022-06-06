import React, { useRef, useEffect, useState, useCallback } from "react";

import mapboxgl from "mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken =
  "pk.eyJ1IjoibWVjaGFuZXllcyIsImEiOiJ6V2F6bmFNIn0.mauWWMuRub6GkCxkc49sTg";

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  // Downtown Sacto
  // let docoLng = -121.5035745;
  // let docoLat = 38.5817533;

  // Empire State Building
  let docoLng = -73.9857;
  let docoLat = 40.7484;

  const [lng, setLng] = useState(docoLng);
  const [lat, setLat] = useState(docoLat);
  // eslint-disable-next-line
  const [zoom, setZoom] = useState(9);

  // ————————————————————————————————————o Sound Visualization -->
  // Ambient Sound 3D Building Visualization -->
  //
  const visualization = useCallback(() => {
    if (!map.current) return;
    setTimeout(() => {
      const bins = 16;
      const maxHeight = 200;
      const binWidth = maxHeight / bins;

      // Divide the buildings into 16 bins based on their true height, using a layer filter.
      for (let i = 0; i < bins; i++) {
        map.current.addLayer({
          id: `3d-buildings-${i}`,
          source: "composite",
          "source-layer": "building",
          filter: [
            "all",
            ["==", "extrude", "true"],
            [">", "height", i * binWidth],
            ["<=", "height", (i + 1) * binWidth],
          ],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#03cce4",
            "fill-extrusion-height-transition": {
              duration: 0,
              delay: 0,
            },
            "fill-extrusion-opacity": 1,
          },
        });
      }

      // Older browsers might not implement mediaDevices at all, so we set an empty object first
      if (navigator.mediaDevices === undefined) {
        navigator.mediaDevices = {};
      }

      // Some browsers partially implement mediaDevices. We can't just assign an object
      // with getUserMedia as it would overwrite existing properties.
      // Here, we will just add the getUserMedia property if it's missing.
      if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = (constraints) => {
          // First get ahold of the legacy getUserMedia, if present
          const getUserMedia =
            navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

          // Some browsers just don't implement it - return a rejected promise with an error
          // to keep a consistent interface
          if (!getUserMedia) {
            return Promise.reject(
              new Error("getUserMedia is not implemented in this browser")
            );
          }

          // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
          return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        };
      }
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          // Set up a Web Audio AudioContext and AnalyzerNode, configured to return the
          // same number of bins of audio frequency data.
          const audioCtx = new (window.AudioContext ||
            window.webkitAudioContext)();

          const analyser = audioCtx.createAnalyser();
          analyser.minDecibels = -90;
          analyser.maxDecibels = -10;
          analyser.smoothingTimeConstant = 0.85;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          analyser.fftSize = 2048;

          const dataArray = new Uint8Array(bins);

          function draw(now) {
            analyser.getByteFrequencyData(dataArray);

            // Use that data to drive updates to the fill-extrusion-height property.
            // Conditionals allow for updating groupings of frequences.
            // 
            for (let i = 0; i < bins; i++) {
              if (i > 12) {
                map.current.setPaintProperty(
                  `3d-buildings-${i}`,
                  "fill-extrusion-height",
                  15 * i + dataArray[i]
                );
              } else if (i > 8) {
                map.current.setPaintProperty(
                  `3d-buildings-${i}`,
                  "fill-extrusion-height",
                  10 * i + dataArray[i]
                );
              } else {
                map.current.setPaintProperty(
                  `3d-buildings-${i}`,
                  "fill-extrusion-height",
                  1 * i + dataArray[i]
                );
              }
            }

            // Animate the map bearing and light color over time, and make the light more
            // intense when the audio is louder.

            // MAP ROTATION
            // map.current.setBearing(now / 300);
            // map.current.setBearing(100);

            // const hue = (now / 100) % 360;
            // const saturation = Math.min(50 + avg / 4, 100);
            // map.current.setLight({
            //   color: `hsl(${hue},${saturation}%,50%)`,
            //   intensity: Math.min(1, (avg / 256) * 10),
            // });

            requestAnimationFrame(draw);
          }

          requestAnimationFrame(draw);
        })
        .catch((err) => {
          console.log("The following gUM error occurred:", err);
        });
    }, 700);
  });

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mechaneyes/ckx9kpyvq0bvu15t7ctqe3053", // Monolyth Targets
      //   style: "mapbox://styles/mechaneyes/ckx956wynanke14lgplyljg4u", // Monolyth Blue
      center: [lng, lat],
      pitch: 61,
      bearing: 110,
      zoom: 16,
    });

    visualization();
  }, [visualization]);

  useEffect(() => {
    rotateCamera(300);
  });

  // ————————————————————————————————————o Camera Rotation -->
  // Camera Rotation -->
  //
  const rotateCamera = (timestamp) => {
    // clamp the rotation between 0 -360 degrees
    // Divide timestamp by 100 to slow rotation to ~10 degrees / sec
    map.current.rotateTo((timestamp / 150) % 360, { duration: 0 });
    // Request the next frame of the animation.
    requestAnimationFrame(rotateCamera);
  };

  const mapContainerStyle = {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh'
  }

  return (
    <div>
      <div ref={mapContainer} className="map-container" style={mapContainerStyle} />
    </div>
  );
};

export default Map;
