import { moderateScale } from './responsive';

export const typography = {
  h1: {
    fontSize: moderateScale(28),
    fontWeight: '700' as const,
    lineHeight: moderateScale(34),
  },
  h2: {
    fontSize: moderateScale(22),
    fontWeight: '600' as const,
    lineHeight: moderateScale(28),
  },
  h3: {
    fontSize: moderateScale(18),
    fontWeight: '600' as const,
    lineHeight: moderateScale(24),
  },
  body: {
    fontSize: moderateScale(15),
    fontWeight: '400' as const,
    lineHeight: moderateScale(21),
  },
  caption: {
    fontSize: moderateScale(13),
    fontWeight: '400' as const,
    lineHeight: moderateScale(18),
  },
  small: {
    fontSize: moderateScale(11),
    fontWeight: '400' as const,
    lineHeight: moderateScale(14),
  },
};
