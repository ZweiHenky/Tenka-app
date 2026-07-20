import { StyleSheet } from "react-native"
import { Palette, Pad, Gap, Radius } from "@/constants/theme"

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.black,
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  header: {
    alignItems: "flex-start",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Gap.base,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.cyan,
  },
  logoHorizontal: {
    width: "120%",
    height: 250,
    alignSelf: "center",
  },
  brandDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 24,
    gap: 8,
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: Palette.cyan,
  },
  description: {
    color: Palette.textSecondary,
    fontSize: 14,
    lineHeight: 24,
    maxWidth: 280,
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: Palette.cyan,
    paddingVertical: 16,
    borderRadius: Radius.lg,
  },
  primaryButtonText: {
    color: Palette.black,
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Gap.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: Pad.base,
    borderRadius: Radius.lg,
  },
  secondaryButtonText: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: "600",
  },
  moreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  moreButtonText: {
    color: Palette.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  footer: {
    alignItems: "flex-start",
  },
  footerDivider: {
    width: 32,
    height: 1,
    backgroundColor: Palette.cyan,
    opacity: 0.5,
    marginBottom: 12,
  },
  footerText: {
    color: Palette.textMuted,
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
})
