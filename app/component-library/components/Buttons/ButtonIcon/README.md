# ButtonIcon

ButtonIcon is a icon component in the form of a button.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacity](https://reactnative.dev/docs/touchableopacity) component.

### `IconName`

Icon name of the icon that will be displayed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../Icons/Icon.types.ts)               | Yes                                                     |

### `onPress`

Function to trigger when pressed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | Yes                                                     |

### `variant`

Optional enum to select between variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [ButtonIconVariants](./ButtonIcon.types.ts)       | No                                                      | Primary                                                |

## Usage

```javascript
<ButtonIcon
  iconName={IconName.Bank}
  onPress={ONPRESS_HANDLER}
  variant={ButtonIconVariants.Primary}
/>;
```
