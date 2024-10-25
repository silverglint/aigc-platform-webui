<script setup lang="ts">
import {ref, watch} from "vue";
import {useRoute} from "vue-router";
import useLoading from "@/hooks/loading.ts";
import {FileItem, FormInstance, Message} from "@arco-design/web-vue";
import {chapterAdd, ChapterInfo, chapters4Sort as queryTextChapterList, ImageDrama,} from "@/api/image-chapter.ts";
import {ROLE_CHANGE} from "@/types/event-types.ts";
import emitter from "@/mitt";

const route = useRoute();
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emits = defineEmits(['update:visible'])

const dialogueParseLoading = useLoading();
const chapterSortLoading = useLoading();

const showDialogue = ref<boolean>(true);
const showAside = ref<boolean>(true);
const showDialogueTable = ref<boolean>(false);
const showSortTable = ref<boolean>(false);

const cacheImageDramas = ref<ImageDrama[]>([]);
const imageDramas = ref<ImageDrama[]>([]);

const sortChanged = ref(false)

const showModal = ref<boolean>(false);
const chapterInfos = ref<ChapterInfo[]>([]);
const formRef = ref<FormInstance>()
const form = ref<ImageDrama & { validate: boolean }>({
  validate: false
} as any);

const tmpChapterId = '123456789987654321';

const file = ref<FileItem | null>(null);

const onChange = (_: FileItem[], fileItem: FileItem) => {
  file.value = {
    ...fileItem,
  };
};

const handleBeforeOk = async (done: (closed: boolean) => void) => {
  const res = await formRef.value?.validate();
  if (!res) {
    const sortChapters: ImageDrama[] = []
    if (sortChanged.value) {
      imageDramas.value.forEach((item, index) => {
        if (item.chapterId === tmpChapterId) {
          form.value.sortOrder = index
        } else {
          sortChapters.push({
            id: item.id,
            sortOrder: index,
          } as ImageDrama)
        }
      });
    }

    const formData = new FormData();
    formData.append('file', file.value?.file as Blob);
    formData.append("chapterAdd", new Blob([JSON.stringify({
      imageDrama: {
        ...form.value,
        projectId: route.query.projectId as string,
        sortOrder: form.value.sortOrder ?? 0
      },
      sortChapters: sortChapters
    })], {
      type: 'application/json'
    }))

    const {msg} = await chapterAdd(formData);
    Message.success(msg);
    done(true);
    emitter?.emit(ROLE_CHANGE)
  } else {
    done(false);
  }
}

const handleChapterSort = () => {
  try {
    chapterSortLoading.setLoading(true);
    showDialogueTable.value = false;
    showSortTable.value = true;

    imageDramas.value = [
      {chapterId: tmpChapterId, chapterName: form.value.chapterName} as ImageDrama,
      ...cacheImageDramas.value
    ]

  } finally {
    chapterSortLoading.setLoading(false);
  }
}

const queryChapters = async () => {
  const {data} = await queryTextChapterList({
    projectId: route.query.projectId as string,
  })
  cacheImageDramas.value = data;
  imageDramas.value = data;
}

const handleChapterNameChange = (value: string) => {
  imageDramas.value = imageDramas.value.map((item) => {
    if (item.chapterId === tmpChapterId) {
      return {
        ...item,
        chapterName: value
      }
    }
    return item
  })
}

const sortInputChange = (target: number | undefined, current: number) => {
  if (target) {
    imageDramas.value.splice(current, 1);
    imageDramas.value.splice(target, 0,
        {chapterId: tmpChapterId, chapterName: form.value.chapterName} as ImageDrama);
  }
}

const close = () => {
  emits('update:visible', false);
}

watch(
    () => props.visible,
    () => {
      showModal.value = props.visible
      if (props.visible) {
        queryChapters()

        chapterInfos.value = []
        formRef.value?.resetFields();
        form.value = {} as any;
        showDialogue.value = true
        showAside.value = true
        showDialogueTable.value = false
        showSortTable.value = false
      }
    },
    {immediate: true}
);
</script>

<template>
  <div>
    <a-modal
        v-model:visible="showModal"
        title="新增剧本"
        :width="512"
        :unmount-on-close="true"
        @before-ok="handleBeforeOk"
        @close="close"
        @cancel="close"
    >
      <div style=" padding: 0 20px">
        <a-row :gutter="24">
          <a-col :span="24">
            <a-form
                ref="formRef"
                :model="form"
                size="small"
                :label-col-props="{ span: 5 }"
                :wrapper-col-props="{ span: 19 }"
            >
              <a-form-item label="章节标题" field="chapterName" required>
                <a-input v-model="form.chapterName" @change="handleChapterNameChange"/>
                <a-button
                    type="primary"
                    style="margin-left: 10px"
                    :disabled="!form.chapterName"
                    :loading="chapterSortLoading.loading.value"
                    @click="handleChapterSort"
                >
                  排序
                </a-button>
              </a-form-item>
              <a-form-item label="字幕" required>
                <a-upload
                    :auto-upload="false"
                    :limit="1"
                    draggable
                    @change="onChange"
                />
              </a-form-item>
            </a-form>
          </a-col>
        </a-row>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>

</style>
