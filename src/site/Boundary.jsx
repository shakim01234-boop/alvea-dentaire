import { Component } from 'react'

/**
 * Garde-fou général.
 *
 * Le site est d'abord un site, et une démonstration 3D ensuite. Si le moteur
 * échoue — pilote graphique, mémoire, ressource illisible — la page doit
 * continuer d'exister : le texte, les tarifs, l'adresse et le rendez-vous.
 *
 * Retenu après incident : un modèle de 88 ko qui ne se chargeait pas suffisait
 * à faire tomber tout l'arbre React et à afficher une page blanche.
 */
export default class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn(`[Alvéa] ${this.props.label || 'bloc'} en échec :`, error?.message)
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null
    return this.props.children
  }
}
