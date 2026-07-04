import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-[2px]"></div>
      <div className="relative z-10 w-full sm:mx-auto sm:max-w-md">
        <Outlet />
      </div>
    </div>
  );
};
