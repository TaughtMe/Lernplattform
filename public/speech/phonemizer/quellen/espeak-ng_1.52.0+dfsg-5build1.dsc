-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

Format: 3.0 (quilt)
Source: espeak-ng
Binary: espeak-ng, espeak-ng-espeak, espeak-ng-data, espeak-ng-data-udeb, libespeak-ng1, libespeak-ng-libespeak1, libespeak-ng-dev, libespeak-ng-libespeak-dev
Architecture: any all
Version: 1.52.0+dfsg-5build1
Maintainer: Debian Accessibility Team <pkg-a11y-devel@alioth-lists.debian.net>
Uploaders: Samuel Thibault <sthibault@debian.org>
Homepage: https://github.com/espeak-ng/espeak-ng
Standards-Version: 4.6.1
Vcs-Browser: https://salsa.debian.org/a11y-team/espeak-ng
Vcs-Git: https://salsa.debian.org/a11y-team/espeak-ng.git
Testsuite: autopkgtest
Testsuite-Triggers: @builddeps@, clang, libclang-rt-dev
Build-Depends: debhelper-compat (= 13), dh-exec, libpcaudio-dev, libsonic-dev, ronn, kramdown
Package-List:
 espeak-ng deb sound optional arch=any
 espeak-ng-data deb sound optional arch=any
 espeak-ng-data-udeb udeb debian-installer optional arch=any
 espeak-ng-espeak deb sound optional arch=all
 libespeak-ng-dev deb libdevel optional arch=any
 libespeak-ng-libespeak-dev deb libdevel optional arch=any
 libespeak-ng-libespeak1 deb libs optional arch=any
 libespeak-ng1 deb libs optional arch=any
Checksums-Sha1:
 5f7cbff586612db6f22bec47d6beb83d401c26fe 16464682 espeak-ng_1.52.0+dfsg.orig.tar.gz
 03c453d47feb3e4314af8b88795a06ed0319df27 50136 espeak-ng_1.52.0+dfsg-5build1.debian.tar.xz
Checksums-Sha256:
 d2a886bae3547a15c52801cb37e415230834a7ee7f9a57352b98d60454d97cea 16464682 espeak-ng_1.52.0+dfsg.orig.tar.gz
 d6302683242afd0fb8e401b319b30cbcaf6c4523a59765647dc11dd49d39277a 50136 espeak-ng_1.52.0+dfsg-5build1.debian.tar.xz
Files:
 c19f54ac5d9d53b4b0a3454848893c1d 16464682 espeak-ng_1.52.0+dfsg.orig.tar.gz
 e35fcc2d0834e9d447cda3263e40d436 50136 espeak-ng_1.52.0+dfsg-5build1.debian.tar.xz

-----BEGIN PGP SIGNATURE-----

iQIzBAEBCgAdFiEEkv5Pi0DK3E7M1gwfWWH9vpxhmAkFAmmBCqUACgkQWWH9vpxh
mAkskw//Tcp/prE2NuA868uSbAg0zMCDiBilwaprOhm5MdBXh0qVoc55ApUoMtIu
8R7y9I8fZ9yluP2mzsi6Jb7b5xuVtXpQcDQFNScKkbvroi3owiYeBltScXgTTROY
UIAFV3DYTWtjHChazHxMO50zjR6ktHpdn6hSqZyLZ63lPPkD2v486ALQIry2PPEn
eSriT7jhHKKz4D6q2OZ4WUIlQfUOTvPSSDDX4/W3pzJc2bBM0pRtAiz7Fjklhm03
FBubo7Q3CtvPIUK1RQZLzYOUJM885cT2Gzn7HHT1IRIIq5fnm8d9QqVf73DOW6tE
JfnwlJ+ZY1gksGhYXCQbfPSPeqnGZ1s9MqoovkM2NBsz3DQkRxdIgkd8vYu8Gow/
xm9Udjmijr9QjcmPWJ3BavbPkSZsbrSVaENfOubqCVYt9c9oJbhTptAgHCPmk7Uq
khpmow3M6dEhzrhQ9MNW7MZZWX9cheKtTwNSjOPOB8J1x4DhLsg440+tzi//wfcR
eFR1Yzf3ea0kH67ZkHqnt5xjbPvwyfCBV6U6zMXoIj6eIVtzfxLLHY2FRG8c2FQf
ZuWw240hhQZKI0jDK4KU2xxh4DiJdU/MTes0GzSFdCE3cZ105uaZSE3zIugN6NO6
PPEOiq+iPir9gF3I/013cPuqp4LEjqs0dwRgTrrNRE1c/lXlzP0=
=Wtuk
-----END PGP SIGNATURE-----
