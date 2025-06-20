{
  description = "Dev shell";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    systems.url = "github:nix-systems/default";
  };

  outputs =
    { ... }@inputs:
    let
      forAllSystems =
        f:
        inputs.nixpkgs.lib.genAttrs (import inputs.systems) (
          system:
          f {
            pkgs = import inputs.nixpkgs { inherit system; };
          }
        );
    in
    {
      devShells = forAllSystems (
        { pkgs }:
        {
          default = pkgs.mkShell {
            buildInputs = [
              pkgs.bashInteractive # do not remove
            ];

            packages = with pkgs; [
              just # do not remove

              # replace with packages that you need in env
              nodejs
              corepack
            ];
          };
        }
      );
    };
}
