
{ pkgs }: {
    deps = [
        pkgs.nodejs-18_x
        pkgs.chromium
        pkgs.mesa.drivers
        pkgs.xorg.libX11
        pkgs.xorg.libXcomposite
        pkgs.xorg.libXdamage
        pkgs.xorg.libXext
        pkgs.xorg.libXfixes
        pkgs.xorg.libXrandr
        pkgs.libxkbcommon
        pkgs.libdrm
        pkgs.mesa
        pkgs.glib
        pkgs.nspr
        pkgs.nss
        pkgs.dbus
        pkgs.atk
        pkgs.at-spi2-atk
        pkgs.alsa-lib
        pkgs.gtk3
        pkgs.expat
        pkgs.xorg.libxcb
        pkgs.udev
        pkgs.cups
        pkgs.pango
        pkgs.cairo
        pkgs.gdk-pixbuf
        pkgs.libuuid
        pkgs.systemd
        pkgs.fontconfig
    ];
}
