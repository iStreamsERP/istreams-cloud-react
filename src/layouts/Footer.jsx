import React from "react";

const Footer = () => {
  return (
    <footer className="p-3 bg-slate-200 text-2xl transition-colors dark:bg-slate-900">
      <p className="text-center text-sm">
        Copyright © {new Date().getFullYear()}{" "}
        <span className="font-semibold">iStreams Cloud</span>. Designed with
        by ❤️ All rights reserved
      </p>
    </footer>
  );
};

export default Footer;
