import { readJson, resolvePath, writeText } from './utils.mjs'

function mergeRealmIntoSkeleton(skeleton, chapterId, generatedRealm) {
  const realms = skeleton.realms || []
  const index = realms.findIndex(
    (realm) =>
      realm.id === generatedRealm.id ||
      realm.name === generatedRealm.name ||
      realm.name === chapterId,
  )
  if (index < 0) {
    throw new Error(`Realm ${chapterId} not found in skeleton.json`)
  }

  const nextRealms = [...realms]
  const existingRealm = nextRealms[index]
  nextRealms[index] = {
    ...existingRealm,
    ...generatedRealm,
    id: existingRealm.id,
    name: existingRealm.name ?? generatedRealm.name,
    planner_seed: existingRealm.planner_seed ?? generatedRealm.planner_seed,
  }
  return {
    ...skeleton,
    realms: nextRealms,
  }
}

export function buildPublishOutputs(chapterId, mergedRealm, skeleton = null) {
  if (chapterId === 'prologue') {
    return [
      {
        path: 'public/data/prologue.json',
        content: mergedRealm,
      },
    ]
  }

  if (!skeleton) {
    throw new Error(`Publishing ${chapterId} requires current skeleton content`)
  }

  return [
    {
      path: 'public/data/skeleton.json',
      content: mergeRealmIntoSkeleton(skeleton, chapterId, mergedRealm),
    },
  ]
}

export function publishChapterOutputs(chapterId, mergedRealm) {
  const skeleton =
    chapterId === 'prologue' ? null : readJson(resolvePath('public', 'data', 'skeleton.json'))
  const outputs = buildPublishOutputs(chapterId, mergedRealm, skeleton)
  for (const output of outputs) {
    writeText(resolvePath(...output.path.split('/')), JSON.stringify(output.content, null, 2))
  }
  return outputs
}
