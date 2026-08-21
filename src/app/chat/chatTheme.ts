export const WA = {
  panel: '#111b21',
  header: '#202c33',
  chatBg: '#0b141a',
  incoming: '#202c33',
  outgoing: '#005c4b',
  inputBar: '#202c33',
  inputField: '#2a3942',
  icon: '#8696a0',
  text: '#e9edef',
  muted: '#8696a0',
  tickRead: '#53bdeb',
  menu: '#233138',
  selected: '#2a3942',
  accent: '#00a884',
} as const;

export const WA_CHAT_BG = {
  bgcolor: WA.chatBg,
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='84' height='84'><g fill='none' stroke='%23ffffff' stroke-width='1' opacity='0.06'><circle cx='12' cy='18' r='4'/><rect x='40' y='10' width='10' height='8' rx='1'/><path d='M62 22h12v8H62z'/><circle cx='22' cy='58' r='5'/><path d='M48 50l8 6-8 6z'/><circle cx='72' cy='64' r='3'/></g></svg>`
  )}")`,
  backgroundRepeat: 'repeat',
} as const;
