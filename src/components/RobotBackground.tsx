import React, { useRef, useEffect, useState } from 'react';
import robotHelmetImg from '../assets/images/robot_helmet_red_1787765541188.jpg';

interface RobotBackgroundProps {
  mode?: 'balanced' | 'vivid' | 'cinema';
  className?: string;
  opacity?: number;
}

export const RobotBackground: React.FC<RobotBackgroundProps> = ({
  mode = 'vivid',
  className = '',
  opacity,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.playsInline = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setVideoLoaded(true))
          .catch((err) => {
            console.log('Video autoplay prevented or fallback to image poster:', err);
          });
      }
    }
  }, []);

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 ${className}`}>
      {/* High-Resolution Glowing Red Cyberpunk Robot Helmet Base Image */}
      <img
        src={robotHelmetImg}
        alt="IntelicatAI Autonomous Android Robot Helmet"
        referrerPolicy="no-referrer"
        className={`absolute inset-0 w-full h-full object-cover object-[65%_center] lg:object-[68%_35%] transition-all duration-700 ${
          mode === 'cinema'
            ? 'scale-105 brightness-115 contrast-110'
            : mode === 'vivid'
            ? 'scale-100 brightness-110 contrast-105'
            : 'scale-100 brightness-95 contrast-100'
        }`}
        style={{ opacity: opacity !== undefined ? opacity : 1 }}
      />

      {/* Looping Live Pulsing Video Stream overlay */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        poster={robotHelmetImg}
        onLoadedData={() => setVideoLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover object-[65%_center] lg:object-[68%_35%] transition-opacity duration-700 ${
          videoLoaded ? 'opacity-90' : 'opacity-0'
        } ${
          mode === 'cinema'
            ? 'scale-105 brightness-120 contrast-110'
            : mode === 'vivid'
            ? 'scale-100 brightness-110 contrast-105'
            : 'scale-100 brightness-95 contrast-100'
        }`}
        src="https://res.cloudinary.com/dk3cxjqhh/video/upload/v1781516999/Android_helmet_pulsing_red_light_202606151506_iiwgyq.mp4"
      />

      {/* Light Radial Vignette so text on left stays 100% readable while the robot shines on right */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
          mode === 'cinema'
            ? 'bg-gradient-to-r from-black/60 via-transparent to-black/20'
            : mode === 'vivid'
            ? 'bg-gradient-to-r from-black/75 via-black/30 to-black/35'
            : 'bg-gradient-to-r from-black/85 via-black/45 to-black/60'
        }`}
      />

      {/* Ambient Red Atmospheric Glow */}
      <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] bg-[#EF233C]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-[#FF2E3E]/15 rounded-full blur-[80px] pointer-events-none" />
    </div>
  );
};
