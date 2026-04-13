import { motion } from 'framer-motion'
import type { PropsWithChildren } from 'react'
import { GUI_LAB_VERSION } from '../../config/version'
import styles from './PhoneShell.module.css'

export function PhoneShell({ children }: PropsWithChildren) {
  return (
    <div className={styles.shellWrap}>
      <motion.div
        className={styles.device}
        initial={{ opacity: 0, scale: 0.96, rotateX: 6 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className={styles.glass} />
        <div className={styles.screen}>
          <div className={styles.screenInner}>{children}</div>
        </div>
        <div className={styles.version}>{GUI_LAB_VERSION}</div>
      </motion.div>
    </div>
  )
}
