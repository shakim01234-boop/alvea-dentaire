import { useState } from 'react'
import { Counter, LineReveal, WordReveal } from './Reveal.jsx'
import { asset } from '../lib/asset'
import { typo, typoDeep } from '../lib/typo'

// typoDeep applique les règles typographiques françaises à toutes les chaînes
// des jeux de données ci-dessous : apostrophes courbes, espaces fines
// insécables, insécables entre nombre et unité. Le contenu reste écrit
// simplement dans le fichier ; la composition est faite à l'affichage.

const FIGURES = typoDeep([
  { value: '2400', label: 'Patients suivis au cabinet' },
  { value: '18', label: "Années d'exercice" },
  { value: '4', label: 'Praticiens, un seul dossier' },
  { value: '0', label: 'Soin réalisé au premier rendez-vous' },
])

// `photo` pointe vers public/images/team/. Tant que le fichier est absent, la
// carte affiche son cadre vide — comme pour les modèles 3D, rien ne casse.
const PEOPLE = typoDeep([
  {
    name: 'Dr Léa Fontenoy',
    role: 'Dentisterie restauratrice, occlusion',
    photo: '/images/team/fontenoy.jpg',
    note: "Reconstruit ce qui peut l'être avant d'envisager de remplacer. Consultations longues, par principe.",
  },
  {
    name: 'Dr Samuel Kerraoui',
    role: 'Implantologie, chirurgie orale',
    photo: '/images/team/kerraoui.jpg',
    note: 'Pose sous guide chirurgical imprimé au cabinet. Refuse une greffe sur deux quand elle peut être évitée.',
  },
  {
    name: 'Dr Anne-Claire Vasseur',
    role: "Orthodontie de l'adulte",
    photo: '/images/team/vasseur.jpg',
    note: 'Gouttières et attaches céramique. Simulation systématique du résultat avant tout engagement.',
  },
  {
    name: 'Yannis Prévôt',
    role: 'Prothésiste, laboratoire intégré',
    photo: '/images/team/prevot.jpg',
    note: 'Fabrique couronnes et facettes sur place. Il voit les patients : cela change la teinte finale.',
  },
])

function Portrait({ src, alt }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <div className="person-portrait">Portrait</div>
  return (
    <div className="person-portrait">
      <img src={asset(src)} alt={alt} loading="lazy" onError={() => setFailed(true)} />
    </div>
  )
}

const TARIFFS = typoDeep([
  { name: 'Consultation et bilan complet', note: "Imagerie 3D et empreinte optique comprises", price: '60 €' },
  { name: 'Détartrage', note: 'Pris en charge par l’Assurance maladie', price: '60 €' },
  { name: 'Soin d’une carie (composite)', note: 'Selon la face et l’étendue', price: '90 – 140 €' },
  { name: 'Couronne céramique', note: 'Fabriquée au laboratoire intégré', price: '500 – 900 €' },
  { name: 'Implant, pilier et couronne', note: 'Forfait complet, guide chirurgical inclus', price: '1 800 – 2 300 €' },
  { name: 'Traitement par gouttières', note: 'Durée moyenne de neuf mois, contrôles compris', price: '3 200 – 4 500 €' },
  { name: 'Éclaircissement au fauteuil', note: 'Avec gouttières d’entretien à domicile', price: '390 €' },
])

const PLEDGES = typoDeep([
  {
    title: 'Le devis avant le fauteuil',
    body: "Aucun acte au-delà de soixante-dix euros n'est engagé sans un devis écrit que vous avez emporté chez vous. Nous ne proposons rien pendant que vous êtes allongé.",
  },
  {
    title: 'Le droit de ne rien faire',
    body: "Une dent qui ne fait pas souffrir et qui ne se dégrade pas peut rester en l'état. La surveillance est un traitement ; nous l'écrivons noir sur blanc quand c'est le bon choix.",
  },
  {
    title: 'Une douleur, une réponse',
    body: 'Un créneau est gardé libre chaque matin pour les urgences de nos patients. Vous appelez avant onze heures, vous êtes vu dans la journée.',
  },
])

export default function Editorial() {
  return (
    <div className="editorial">
      <section id="cabinet">
        <div className="section-head">
          <span className="kicker reveal">Le cabinet</span>
          <div>
            <LineReveal
              lines={['Un plateau technique commun,', 'pour éviter de vous renvoyer', "d'un praticien à l'autre."]}
            />
            <WordReveal
              delay={0.3}
              text="Chirurgie, prothèse, orthodontie et laboratoire occupent le même étage. Votre dossier circule entre quatre paires d'yeux sans que vous ayez à le transporter."
            />
          </div>
        </div>

        <div className="figures reveal" data-delay="2">
          {FIGURES.map((f) => (
            <div className="figure" key={f.label}>
              <div className="figure-value">
                <Counter value={f.value} />
              </div>
              <div className="figure-label">{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="equipe">
        <div className="section-head">
          <span className="kicker reveal">L'équipe</span>
          <div>
            <LineReveal lines={['Quatre praticiens,', 'une seule discussion', 'sur votre cas.']} />
          </div>
        </div>

        <div className="people">
          {PEOPLE.map((p, i) => (
            <article className="person reveal" data-delay={i % 4} key={p.name}>
              <Portrait src={p.photo} alt={p.name} />
              <h3>{p.name}</h3>
              <div className="person-role">{p.role}</div>
              <p className="person-note">{p.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="soins">
        <div className="section-head">
          <span className="kicker reveal">Soins et honoraires</span>
          <div>
            <LineReveal lines={['Les prix affichés avant', 'le rendez-vous, pas après.']} />
            <WordReveal
              delay={0.26}
              text="Nous sommes conventionnés. Les fourchettes ci-dessous couvrent la totalité de ce que nous pratiquons : il n'existe pas de ligne cachée."
            />
          </div>
        </div>

        <div className="tariffs">
          {TARIFFS.map((t, i) => (
            <div className="tariff reveal" data-delay={i % 3} key={t.name}>
              <div>
                <div className="tariff-name">{t.name}</div>
                <span className="tariff-note">{t.note}</span>
              </div>
              <div className="tariff-price">{t.price}</div>
            </div>
          ))}
        </div>

        <p className="legal reveal">
          {typo(
            'Tarifs indicatifs 2026, remis par écrit avant tout soin. Un devis détaillé est obligatoire au-delà de 70 € et engage le cabinet. Tiers payant appliqué sur la part obligatoire.',
          )}
        </p>
      </section>

      <section id="engagements">
        <div className="section-head">
          <span className="kicker reveal">Ce que nous vous dirons toujours</span>
          <div>
            <LineReveal lines={['Trois règles que nous', "n'avons jamais négociées."]} />
          </div>
        </div>

        <div className="pledges">
          {PLEDGES.map((p, i) => (
            <div className="pledge reveal" data-delay={i} key={p.title}>
              <span className="pledge-index">{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="booking" id="rendez-vous">
        <section>
          <div className="booking-grid">
            <div>
              <span className="kicker reveal">Prendre rendez-vous</span>
              <LineReveal
                className="booking-title"
                lines={['Le premier rendez-vous', 'dure quarante-cinq minutes.']}
              />
              <WordReveal
                className="booking-lede"
                delay={0.26}
                text="Il est consacré à l'examen et à l'explication. Venez avec vos radios précédentes si vous en avez, et avec la liste de vos traitements en cours."
              />

              <dl className="practical reveal" data-delay="2">
                <dt>Adresse</dt>
                <dd>12 rue de Verneuil, 75007 Paris</dd>
                <dd>Métro Rue du Bac, sortie Saint-Germain</dd>
                <dt>Horaires</dt>
                <dd>{typo('Du lundi au vendredi, 8 h 30 – 19 h')}</dd>
                <dd>Samedi matin sur rendez-vous</dd>
                <dt>Urgences patients</dt>
                <dd>{typo('01 45 00 00 00 — appel avant 11 h, vu dans la journée')}</dd>
              </dl>
            </div>

            <Form />
          </div>
        </section>
      </div>

      <footer>
        <div>
          <div className="wordmark" style={{ marginBottom: '1rem' }}>
            Alvé<span>a</span>
          </div>
          <p className="footer-note">
            Cabinet dentaire — 12 rue de Verneuil, 75007 Paris. Conventionné secteur 1. Mentions
            légales, politique de confidentialité, accessibilité.
          </p>
        </div>
        <div className="mock-badge">Maquette de démonstration — cabinet fictif</div>
      </footer>
    </div>
  )
}

function Form() {
  return (
    <form
      className="reveal"
      data-delay="1"
      onSubmit={(e) => {
        e.preventDefault()
      }}
    >
      <label className="field">
        <span>Nom et prénom</span>
        <input type="text" name="name" autoComplete="name" required />
      </label>
      <label className="field">
        <span>Téléphone</span>
        <input type="tel" name="phone" autoComplete="tel" required />
      </label>
      <label className="field">
        <span>Motif</span>
        <select name="reason" defaultValue="bilan">
          <option value="bilan">Premier bilan complet</option>
          <option value="douleur">Douleur ou urgence</option>
          <option value="implant">Projet d'implant</option>
          <option value="alignement">Alignement</option>
          <option value="esthetique">Esthétique du sourire</option>
          <option value="suivi">Suivi et contrôle</option>
        </select>
      </label>
      <label className="field">
        <span>Disponibilités</span>
        <input type="text" name="slot" placeholder="Ex. mardi ou jeudi après-midi" />
      </label>

      <button className="button" type="submit" disabled>
        Demander un rendez-vous
      </button>
      <p className="form-note">
        {typo(
          'Formulaire inactif : ceci est une maquette. Sur le site réel, la demande partirait vers le secrétariat et ne serait jamais une confirmation automatique.',
        )}
      </p>
    </form>
  )
}
