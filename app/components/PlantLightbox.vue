<script setup lang="ts">
import { useMagicKeys } from '@vueuse/core'

type PhotoItem = {
  id: string
  image_url: string
  taken_at?: string | null
  url?: string
}

const props = withDefaults(defineProps<{
  photos: PhotoItem[]
  modelValue: boolean
  imageUrlKey?: string
  showAnalyzeButton?: boolean
}>(), {
  imageUrlKey: 'image_url',
  showAnalyzeButton: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  analyze: [photo: PhotoItem]
}>()

const currentIndex = ref(0)

const currentPhoto = computed(() => props.photos[currentIndex.value])

const currentPhotoUrl = computed(() => {
  const photo = currentPhoto.value
  if (!photo)
    return ''
  return photo[props.imageUrlKey as keyof PhotoItem] as string || ''
})

function next() {
  if (currentIndex.value + 1 === props.photos.length) {
    currentIndex.value = 0
  }
  else {
    currentIndex.value++
  }
}

function previous() {
  if (currentIndex.value === 0) {
    currentIndex.value = props.photos.length - 1
  }
  else {
    currentIndex.value--
  }
}

function open(index: number) {
  currentIndex.value = index
  emit('update:modelValue', true)
}

function close() {
  emit('update:modelValue', false)
  emit('close')
  currentIndex.value = 0
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString)
    return ''
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const { left, right, escape } = useMagicKeys()
watch(left, (v) => {
  if (v && props.modelValue)
    previous()
})

watch(right, (v) => {
  if (v && props.modelValue)
    next()
})

watch(escape, (v) => {
  if (v && props.modelValue)
    close()
})

defineExpose({
  open,
  close,
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed z-40 bg-black/80 backdrop-blur-xs top-0 left-0 right-0 bottom-0 flex flex-col justify-center items-center p-4 xl:p-20"
      @click.self="close"
    >
      <div
        class="h-full max-h-screen relative flex items-center"
        @click.self="close"
      >
        <div class="absolute flex w-full justify-between">
          <div class="bg-white p-1 flex rounded-lg">
            <UIcon
              name="i-heroicons:chevron-left"
              size="xs"
              class="w-8 h-8 text-gray-900 cursor-pointer"
              @click="previous"
            />
          </div>
          <div class="bg-white p-1 flex rounded-lg">
            <UIcon
              name="i-heroicons:chevron-right"
              size="xs"
              class="w-8 h-8 text-gray-900 cursor-pointer"
              @click="next"
            />
          </div>
        </div>
        <div
          v-if="showAnalyzeButton"
          class="bg-white p-3 rounded-lg absolute bottom-2 -translate-x-1/2 left-1/2 flex items-center gap-3"
        >
          <span>{{ formatDate(currentPhoto?.taken_at) }}</span>
          <UButton
            icon="i-heroicons-sparkles"
            color="primary"
            variant="solid"
            size="sm"
            @click="emit('analyze', currentPhoto!)"
          >
            KI-Analyse
          </UButton>
        </div>
        <NuxtImg
          v-if="currentPhotoUrl"
          class="h-auto max-h-full w-auto rounded-lg overflow-hidden"
          :src="currentPhotoUrl"
        />
      </div>
    </div>
  </Teleport>
</template>
