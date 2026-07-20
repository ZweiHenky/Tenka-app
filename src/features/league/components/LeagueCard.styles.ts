import { StyleSheet } from "react-native"
import { Palette, Radius, Pad, Gap } from "@/constants/theme"

export const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: Radius.xl,
    overflow: "hidden",
    backgroundColor: Palette.surface,
    shadowColor: Palette.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  hero: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.overlay,
  },
  statusRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.cyan,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  titleBlock: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  titleDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.sm,
    backgroundColor: Palette.cyan,
    marginBottom: 6,
  },
  title: {
    color: Palette.white,
    fontSize: 20,
    fontWeight: "700",
  },
  titleDivider: {
    width: 48,
    height: 1,
    backgroundColor: Palette.cyan,
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginTop: 4,
  },

  divider: {
    width: 48,
    height: 1,
    backgroundColor: Palette.cyan,
    marginLeft: Pad.xl,
    marginTop: Gap.micro,
    marginBottom: Gap.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: Pad.xl,
    paddingRight: Pad.base,
    paddingVertical: Pad.md,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.white,
  },
  logoImage: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
  },
  infoContent: {
    flex: 1,
  },
  grid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: "row",
  },
  gridCellLeft: {
    width: "50%",
    alignItems: "center",
    paddingVertical: 2,
    paddingRight: 4,
  },
  gridCellRight: {
    width: "50%",
    alignItems: "center",
    paddingVertical: 2,
    paddingLeft: 4,
  },
  label: {
    color: Palette.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  value: {
    fontSize: 14,
    textAlign: "center",
  },
  valueBold: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  valueGold: {
    fontSize: 14,
    fontWeight: "700",
    color: Palette.warning,
    textAlign: "center",
  },
  valueBone: {
    fontSize: 14,
    fontWeight: "700",
    color: Palette.text,
    textAlign: "center",
  },
  competenciaValue: {
    fontSize: 14,
    color: Palette.text,
    textAlign: "center",
  },
})
