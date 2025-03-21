
{ pkgs }: {
  deps = [
    pkgs.chromium
    pkgs.lsof
    pkgs.libnss
    pkgs.libatk
    pkgs.at-spi2-atk
    pkgs.libcups
    pkgs.libxcomposite
    pkgs.libxdamage
    pkgs.libxrandr
    pkgs.libgbm
    pkgs.alsa-lib
  ];
}
