declare module 'react-native-vector-icons/MaterialIcons' {
  import { Component } from 'react';
    import { StyleProp, TextStyle } from 'react-native';
  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }
  export default class MaterialIcons extends Component<IconProps> {}
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { Component } from 'react';
    import { StyleProp, TextStyle } from 'react-native';
  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }
  export default class MaterialCommunityIcons extends Component<IconProps> {}
}


