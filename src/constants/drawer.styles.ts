import { StyleSheet } from "react-native"
import { Palette, Pad, Gap, Radius } from "@/constants/theme"

export const styles = StyleSheet.create({
  scroll: {
    backgroundColor: Palette.black,
  },
  header: {
    paddingHorizontal: Pad.xl,
    paddingTop: 64,
    paddingBottom: 28,
  },
  brand: {
    color: Palette.cyan,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  brandDivider: {
    width: 32,
    height: 2,
    backgroundColor: Palette.cyan,
    marginVertical: 8,
  },
  brandSub: {
    color: Palette.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  navSection: {
    marginTop: Gap.md,
    paddingHorizontal: Pad.md,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
    paddingVertical: Pad.md,
    paddingHorizontal: Pad.base,
    borderRadius: Radius.lg,
    marginBottom: Pad.half,
    position: "relative",
  },
  itemContainerFocused: {
    backgroundColor: Palette.cyan10,
    borderLeftWidth: 4,
    borderLeftColor: Palette.cyan,
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  itemBulletFocused: {
    backgroundColor: Palette.cyan,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: Pad.xl,
    marginVertical: Pad.base,
  },
  signInContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
    paddingVertical: Pad.md,
    paddingHorizontal: 28,
  },
  signInBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.cyan,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Pad.base,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    marginHorizontal: Pad.xl,
  },
  footerLogo: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  footerVersion: {
    color: Palette.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
})
