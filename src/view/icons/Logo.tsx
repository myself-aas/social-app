import {forwardRef} from 'react'
import {type TextProps} from 'react-native'
import Svg, {
  Defs,
  LinearGradient,
  Path,
  type PathProps,
  Stop,
  type SvgProps,
} from 'react-native-svg'
import {Image} from 'expo-image'

import {useLogoVariant} from '#/view/icons/useLogoVariant'
import {flatten, useTheme} from '#/alf'

const ratio = 100 / 86

type Props = {
  allowVariants?: boolean
  fill?: PathProps['fill']
  style?: TextProps['style']
} & Omit<SvgProps, 'style'>

export const Logo = forwardRef(function LogoImpl(props: Props, ref) {
  const t = useTheme()
  const {allowVariants = true, fill, ...rest} = props
  const gradient = fill === 'sky'
  const styles = flatten(props.style)
  const _fill = gradient
    ? 'url(#sky)'
    : fill || styles?.color || t.palette.primary_500
  // @ts-expect-error it's fiiiiine
  const size = parseInt(rest.width || 32, 10)

  const logoVariant = useLogoVariant(allowVariants)

  if (logoVariant === 'kawaii') {
    return (
      <Image
        source={
          size > 100
            ? require('../../../assets/kawaii.png')
            : require('../../../assets/kawaii_smol.png')
        }
        accessibilityLabel="reme"
        accessibilityHint=""
        accessibilityIgnoresInvertColors
        style={[{height: size, aspectRatio: 1.4}]}
      />
    )
  }

  return (
    <Svg
      fill="none"
      // @ts-expect-error it's fiiiiine
      ref={ref}
      viewBox="10 6 86 100"
      {...rest}
      style={[{width: size, height: size * ratio}, styles]}>
      {gradient && (
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#008FF6" stopOpacity="1" />
            <Stop offset="1" stopColor="#9ED7FF" stopOpacity="1" />
          </LinearGradient>
        </Defs>
      )}

      <Path
        fill={_fill}
        d="M22 84C14 66 18 38 46 20C64 8 86 8 90 20C94 34 84 58 64 74C48 86 32 89 22 84Z"
      />
      <Path
        fill={_fill}
        d="M22 84C20 90 18 94 15.5 97.5C13 101 17.5 104 20.5 100.5C23.5 97 25 90 25 86Z"
      />
    </Svg>
  )
})
