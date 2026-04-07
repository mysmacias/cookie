import { StyleSheet } from '@react-pdf/renderer';

/** Printable width inside padded A4 (~595.28 − 2×52). Numeric widths avoid Yoga/% quirks on Image. */
export const PDF_BODY_WIDTH_PT = 491;

const WARM = '#5c4033';
const WARM_LIGHT = '#6b4f3b';
const RULE_COLOR = '#d6cdc5';
const RULE_LIGHT = '#e8e2db';
const BG_WARM = '#faf7f3';
const TEXT = '#1a1a1a';
const TEXT_SECONDARY = '#444';
const TEXT_MUTED = '#888';

export const pdfStyles = StyleSheet.create({
  /* ---- Page ---- */
  page: {
    paddingTop: 52,
    paddingBottom: 60,
    paddingHorizontal: 52,
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
    color: TEXT,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 52,
    right: 52,
    fontSize: 7.5,
    color: TEXT_MUTED,
    borderTopWidth: 0.4,
    borderTopColor: RULE_COLOR,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  /* ---- Header area ---- */
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  category: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: WARM_LIGHT,
    fontFamily: 'Helvetica-Bold',
  },
  heirloomBadge: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: WARM,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: BG_WARM,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.15,
    marginBottom: 8,
    color: TEXT,
  },
  description: {
    fontSize: 11,
    fontStyle: 'italic',
    color: TEXT_SECONDARY,
    lineHeight: 1.6,
    marginBottom: 16,
  },

  /* ---- Decorative rule ---- */
  rule: {
    borderBottomWidth: 0.5,
    borderBottomColor: RULE_COLOR,
    marginBottom: 14,
  },
  ruleLight: {
    borderBottomWidth: 0.4,
    borderBottomColor: RULE_LIGHT,
    marginTop: 4,
    marginBottom: 14,
  },

  /* ---- Metadata strip ---- */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: RULE_COLOR,
  },
  metaItem: {
    marginRight: 28,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 6.5,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
  },

  /* ---- Tags ---- */
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  tag: {
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: WARM,
    backgroundColor: BG_WARM,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
    marginRight: 6,
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },

  /* ---- Hero ---- */
  hero: {
    width: PDF_BODY_WIDTH_PT,
    maxHeight: 240,
    objectFit: 'cover',
    borderRadius: 4,
    marginBottom: 18,
  },

  /* ---- Chef's note callout ---- */
  chefNoteBox: {
    backgroundColor: BG_WARM,
    padding: 14,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: WARM,
    marginBottom: 22,
  },
  chefNoteTitle: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: WARM_LIGHT,
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
  },
  chefNoteBody: {
    fontSize: 10,
    fontStyle: 'italic',
    color: TEXT_SECONDARY,
    lineHeight: 1.6,
  },

  /* ---- Section headings ---- */
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    marginBottom: 4,
    marginTop: 10,
  },
  sectionSubline: {
    borderBottomWidth: 1.5,
    borderBottomColor: WARM,
    width: 32,
    marginBottom: 14,
  },

  /* ---- Ingredients ---- */
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 0.4,
    borderBottomColor: RULE_LIGHT,
  },
  ingredientInner: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  ingredientThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    objectFit: 'cover',
    marginRight: 8,
  },
  ingredientName: {
    flex: 1,
    paddingRight: 12,
    fontSize: 10.5,
  },
  ingredientAmount: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    color: WARM,
    textAlign: 'right',
  },

  /* ---- Preparation / steps ---- */
  stepBlock: {
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: WARM,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumber: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: WARM,
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: TEXT,
  },
  stepLinked: {
    fontSize: 8.5,
    fontStyle: 'italic',
    color: WARM_LIGHT,
    marginBottom: 3,
  },
  stepBody: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    lineHeight: 1.55,
    marginBottom: 4,
  },
  stepTimer: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: WARM,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: BG_WARM,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  stepPhoto: {
    width: PDF_BODY_WIDTH_PT,
    maxHeight: 160,
    objectFit: 'cover',
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 6,
  },

  /* ---- Cookbook cover ---- */
  coverPage: {
    paddingTop: 52,
    paddingBottom: 60,
    paddingHorizontal: 52,
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    color: TEXT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverBrand: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 4,
    color: TEXT_MUTED,
    marginBottom: 14,
    fontFamily: 'Helvetica-Bold',
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    textAlign: 'center',
    color: TEXT,
  },
  coverRule: {
    borderBottomWidth: 2,
    borderBottomColor: WARM,
    width: 48,
    marginBottom: 14,
  },
  coverSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 6,
  },
  coverDate: {
    fontSize: 10,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 4,
  },

  /* ---- TOC ---- */
  tocTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  tocSubline: {
    borderBottomWidth: 1.5,
    borderBottomColor: WARM,
    width: 32,
    marginBottom: 18,
  },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 6,
    borderBottomWidth: 0.3,
    borderBottomColor: RULE_LIGHT,
  },
  tocNumber: {
    width: 24,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: WARM,
  },
  tocRecipeTitle: {
    flex: 1,
    fontSize: 11,
    color: TEXT,
  },
  tocCategory: {
    fontSize: 8,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  /* ---- Shopping list appendix ---- */
  appendixTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  appendixSubline: {
    borderBottomWidth: 1.5,
    borderBottomColor: WARM,
    width: 32,
    marginBottom: 16,
  },
  shoppingItem: {
    fontSize: 10,
    paddingVertical: 4,
    borderBottomWidth: 0.3,
    borderBottomColor: RULE_LIGHT,
    flexDirection: 'row',
  },
  shoppingBullet: {
    width: 14,
    fontSize: 10,
    color: WARM,
  },
  shoppingText: {
    flex: 1,
    fontSize: 10,
    color: TEXT_SECONDARY,
  },
});
